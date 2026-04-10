package hu.szabolcst.idorendmaker.service;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Ensures that the catalog database file exists on disk before the catalog
 * datasource attempts to connect. In Phase 1 the seeded file is intentionally
 * empty — Phase 6 will add copying a bundled seed from the classpath and
 * performing updates from a remote source.
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

    private final DatabasePathResolver pathResolver;

    @PostConstruct
    public void ensureCatalogDatabaseExists() {
        final String catalogPath = pathResolver.resolveCatalogDbPath();
        final File catalogFile = new File(catalogPath);

        if (catalogFile.exists() && catalogFile.length() > 0) {
            log.info("catalog.db already exists at {}", catalogPath);
            return;
        }

        final File parent = catalogFile.getParentFile();
        if (parent != null && !parent.exists()) {
            log.info("Creating catalog directory: {}", parent.getAbsolutePath());
            if (!parent.mkdirs()) {
                log.warn("Failed to create catalog directory: {}", parent.getAbsolutePath());
            }
        }

        final String jdbcUrl = "jdbc:sqlite:" + catalogPath;
        log.info("Seeding empty catalog.db via JDBC at {}", catalogPath);

        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             Statement stmt = conn.createStatement()) {
            // Opening the connection causes xerial to create the file on disk.
            // Set WAL so the freshly-created file matches the PRAGMAs the
            // datasource will apply on every subsequent connection.
            stmt.execute("PRAGMA journal_mode=WAL");
            log.info("Seeded empty catalog.db at {}", catalogPath);
        } catch (final Exception ex) {
            log.error("Failed to seed empty catalog.db at {}: {}", catalogPath, ex.getMessage(), ex);
            throw new IllegalStateException("Unable to create catalog.db at " + catalogPath, ex);
        }
    }
}
