package hu.szabolcst.idorendmaker.service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Ensures that the catalog database file exists on disk before the catalog
 * datasource attempts to connect. On first launch (or when the file is missing
 * / empty), copies the bundled seed from {@code classpath:db/seed-catalog.db}.
 * After bootstrap, validates that the on-disk catalog's schema version matches
 * the version this application build expects.
 *
 * <p>The catalog datasource bean declares {@code @DependsOn("catalogBootstrapService")}
 * so that Spring initializes this component before the HikariCP pool opens its
 * first connection.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogBootstrapService {

    /**
     * Spring bean name for this component. Exposed as a constant so that
     * {@code @DependsOn} references from other configuration classes stay in
     * sync if the class is ever renamed.
     */
    public static final String BEAN_NAME = "catalogBootstrapService";

    private static final String SEED_CLASSPATH = "db/seed-catalog.db";

    private final DatabasePathResolver pathResolver;

    @Value("${app.catalog.expected-schema-version:1}")
    private int expectedSchemaVersion;

    @PostConstruct
    public void ensureCatalogDatabaseExists() {
        final String catalogPath = pathResolver.resolveCatalogDbPath();
        final File catalogFile = new File(catalogPath);

        if (catalogFile.exists() && catalogFile.length() > 0) {
            log.info("catalog.db already exists at {}", catalogPath);
        } else {
            copySeedCatalog(catalogFile, catalogPath);
        }

        verifySchemaVersion(catalogPath);
    }

    /**
     * Copies the bundled seed catalog from the classpath to disk.
     */
    private void copySeedCatalog(final File catalogFile, final String catalogPath) {
        final File parent = catalogFile.getParentFile();
        if (parent != null && !parent.exists()) {
            log.info("Creating catalog directory: {}", parent.getAbsolutePath());
            if (!parent.mkdirs()) {
                log.warn("Failed to create catalog directory: {}", parent.getAbsolutePath());
            }
        }

        final ClassPathResource seedResource = new ClassPathResource(SEED_CLASSPATH);
        if (!seedResource.exists()) {
            throw new IllegalStateException(
                "Seed catalog not found on classpath: " + SEED_CLASSPATH
                    + ". The application cannot start without a seed catalog.");
        }

        try (InputStream in = seedResource.getInputStream()) {
            Files.copy(in, catalogFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            log.info("Copied seed catalog.db from classpath to {}", catalogPath);
        } catch (final IOException ex) {
            throw new IllegalStateException(
                "Failed to copy seed catalog.db to " + catalogPath, ex);
        }
    }

    /**
     * Reads the {@code schema_version} row from {@code catalog_meta} using raw
     * JDBC (the catalog EntityManagerFactory is not yet available at this point)
     * and compares it against the application's expected schema version.
     */
    private void verifySchemaVersion(final String catalogPath) {
        final String jdbcUrl = "jdbc:sqlite:" + catalogPath;

        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT meta_value FROM catalog_meta WHERE meta_key = 'schema_version'")) {

            if (!rs.next()) {
                throw new IllegalStateException(
                    "Catalog database at " + catalogPath
                        + " has no 'schema_version' row in catalog_meta. "
                        + "The catalog file may be corrupt or from an incompatible version.");
            }

            final int actualVersion;
            try {
                actualVersion = Integer.parseInt(rs.getString("meta_value"));
            } catch (final NumberFormatException ex) {
                throw new IllegalStateException(
                    "Catalog schema_version is not a valid integer: "
                        + rs.getString("meta_value"), ex);
            }

            if (actualVersion != expectedSchemaVersion) {
                throw new IllegalStateException(
                    "Catalog schema version " + actualVersion
                        + " does not match expected version " + expectedSchemaVersion
                        + ". Please update the application or the catalog.");
            }

            log.info("Catalog schema version verified: {}", actualVersion);

        } catch (final IllegalStateException ex) {
            // Re-throw our own exceptions as-is.
            throw ex;
        } catch (final Exception ex) {
            throw new IllegalStateException(
                "Failed to verify catalog schema version at " + catalogPath, ex);
        }
    }
}
