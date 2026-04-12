package hu.szabolcst.idorendmaker.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import jakarta.persistence.EntityManagerFactory;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.sql.DataSource;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Handles checking for and downloading catalog updates from a remote manifest
 * URL. The update flow is triggered explicitly by the user via the REST API
 * (no automatic polling in v1).
 *
 * <p>Responsibility chain:
 * <ol>
 *   <li>Fetch manifest JSON from the configured URL</li>
 *   <li>Compare remote catalog version against the local one</li>
 *   <li>Download the new catalog to a staging file</li>
 *   <li>Verify SHA-256 checksum</li>
 *   <li>Close the catalog connection pool and entity manager factory</li>
 *   <li>Atomically swap the catalog file on disk</li>
 *   <li>Set a restart-required flag (EMF rebuild is deferred to app restart)</li>
 * </ol>
 */
@Slf4j
@Service
public class CatalogUpdateService {

    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(30);

    private final DatabasePathResolver pathResolver;
    private final ObjectMapper objectMapper;
    private final DataSource catalogDataSource;
    private final EntityManagerFactory catalogEntityManagerFactory;
    private final HttpClient httpClient;

    @Value("${app.catalog.manifest-url:}")
    private String manifestUrl;

    @Value("${app.catalog.expected-schema-version:1}")
    private int expectedSchemaVersion;

    @Getter
    private volatile boolean restartRequired;

    public CatalogUpdateService(
            final DatabasePathResolver pathResolver,
            final ObjectMapper objectMapper,
            @Qualifier("catalogDataSource") final DataSource catalogDataSource,
            @Qualifier("catalogEntityManagerFactory") final EntityManagerFactory catalogEntityManagerFactory) {
        this.pathResolver = pathResolver;
        this.objectMapper = objectMapper;
        this.catalogDataSource = catalogDataSource;
        this.catalogEntityManagerFactory = catalogEntityManagerFactory;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(HTTP_TIMEOUT)
            .build();
    }

    @PreDestroy
    void closeHttpClient() {
        httpClient.close();
    }

    /**
     * Checks for a catalog update and downloads it if available.
     *
     * @return result describing what happened
     */
    public UpdateResult checkAndUpdate() {
        if (manifestUrl == null || manifestUrl.isBlank()) {
            log.info("Catalog update check skipped: manifest URL not configured");
            return UpdateResult.notConfigured();
        }

        try {
            final CatalogManifest manifest = fetchManifest();
            log.info("Remote catalog manifest: version={}, schemaVersion={}",
                manifest.catalogVersion(), manifest.schemaVersion());

            if (manifest.schemaVersion() != expectedSchemaVersion) {
                final String msg = "Remote catalog schema version " + manifest.schemaVersion()
                    + " does not match expected version " + expectedSchemaVersion
                    + ". A newer application version may be required.";
                log.warn(msg);
                return UpdateResult.error(msg);
            }

            final String currentVersion = readCurrentCatalogVersion();
            log.info("Current catalog version: {}", currentVersion);

            if (manifest.catalogVersion().compareTo(currentVersion) <= 0) {
                log.info("Catalog is already up to date (version {})", currentVersion);
                return UpdateResult.upToDate(currentVersion);
            }

            final Path catalogPath = Path.of(pathResolver.resolveCatalogDbPath());
            final Path stagingPath = catalogPath.resolveSibling("catalog.db.new");

            downloadCatalog(manifest.downloadUrl(), stagingPath);
            verifySha256(stagingPath, manifest.sha256());

            // Close the catalog connection pool and EMF so the file isn't locked
            // (critical on Windows where open file handles prevent moves).
            closeCatalogResources();

            try {
                Files.move(stagingPath, catalogPath,
                    StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (final Exception ex) {
                // Clean up staging file on move failure
                try {
                    Files.deleteIfExists(stagingPath);
                } catch (final Exception cleanupEx) {
                    log.warn("Failed to clean up staging file {}: {}",
                        stagingPath, cleanupEx.getMessage());
                }
                throw ex;
            }
            log.info("Catalog file swapped successfully");

            restartRequired = true;

            return UpdateResult.updated(manifest.catalogVersion());

        } catch (final UpdateResult.UpdateException ex) {
            return UpdateResult.error(ex.getMessage());
        } catch (final Exception ex) {
            log.error("Catalog update failed", ex);
            return UpdateResult.error("Catalog update failed: " + ex.getMessage());
        }
    }

    /**
     * Reads all catalog_meta rows and returns them as a map, plus the
     * restart_required flag. Used by the controller for the version endpoint.
     */
    public Map<String, Object> getCatalogVersionInfo() {
        final Map<String, Object> result = new LinkedHashMap<>();
        final String catalogPath = pathResolver.resolveCatalogDbPath();
        final String jdbcUrl = "jdbc:sqlite:" + catalogPath;

        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT meta_key, meta_value FROM catalog_meta")) {

            while (rs.next()) {
                result.put(rs.getString("meta_key"), rs.getString("meta_value"));
            }
        } catch (final Exception ex) {
            log.error("Failed to read catalog metadata", ex);
            result.put("error", "Failed to read catalog metadata: " + ex.getMessage());
        }

        result.put("restart_required", restartRequired);
        return result;
    }

    private void closeCatalogResources() {
        try {
            catalogEntityManagerFactory.close();
            log.info("Closed catalog EntityManagerFactory");
        } catch (final Exception ex) {
            log.warn("Failed to close catalog EntityManagerFactory: {}", ex.getMessage());
        }

        try {
            ((HikariDataSource) catalogDataSource).close();
            log.info("Closed catalog DataSource (HikariCP pool)");
        } catch (final Exception ex) {
            log.warn("Failed to close catalog DataSource: {}", ex.getMessage());
        }
    }

    private CatalogManifest fetchManifest() {
        try {
            final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(manifestUrl))
                .timeout(HTTP_TIMEOUT)
                .GET()
                .build();

            final HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new UpdateResult.UpdateException(
                    "Manifest fetch failed with HTTP " + response.statusCode());
            }

            return objectMapper.readValue(response.body(), CatalogManifest.class);

        } catch (final UpdateResult.UpdateException ex) {
            throw ex;
        } catch (final Exception ex) {
            throw new UpdateResult.UpdateException(
                "Failed to fetch manifest from " + manifestUrl + ": " + ex.getMessage());
        }
    }

    private String readCurrentCatalogVersion() {
        final String catalogPath = pathResolver.resolveCatalogDbPath();
        final String jdbcUrl = "jdbc:sqlite:" + catalogPath;

        try (Connection conn = DriverManager.getConnection(jdbcUrl);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(
                 "SELECT meta_value FROM catalog_meta WHERE meta_key = 'catalog_version'")) {

            return rs.next() ? rs.getString("meta_value") : "";

        } catch (final Exception ex) {
            log.warn("Failed to read current catalog version: {}", ex.getMessage());
            return "";
        }
    }

    private void downloadCatalog(final String downloadUrl, final Path target) {
        try {
            final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(downloadUrl))
                .timeout(Duration.ofMinutes(5))
                .GET()
                .build();

            final HttpResponse<InputStream> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofInputStream());

            if (response.statusCode() != 200) {
                throw new UpdateResult.UpdateException(
                    "Catalog download failed with HTTP " + response.statusCode());
            }

            try (InputStream in = response.body()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("Downloaded catalog to staging file: {} ({} bytes)",
                target, Files.size(target));

        } catch (final UpdateResult.UpdateException ex) {
            throw ex;
        } catch (final Exception ex) {
            throw new UpdateResult.UpdateException(
                "Failed to download catalog: " + ex.getMessage());
        }
    }

    private void verifySha256(final Path file, final String expectedHash) {
        if (expectedHash == null || expectedHash.isBlank()) {
            log.warn("No SHA-256 hash in manifest, skipping verification");
            return;
        }

        try {
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            final byte[] fileBytes = Files.readAllBytes(file);
            final byte[] hashBytes = digest.digest(fileBytes);
            final String actualHash = HexFormat.of().formatHex(hashBytes);

            if (!actualHash.equalsIgnoreCase(expectedHash)) {
                // Clean up the staging file on checksum mismatch.
                Files.deleteIfExists(file);
                throw new UpdateResult.UpdateException(
                    "SHA-256 mismatch: expected " + expectedHash + ", got " + actualHash);
            }

            log.info("SHA-256 checksum verified: {}", actualHash);

        } catch (final UpdateResult.UpdateException ex) {
            throw ex;
        } catch (final Exception ex) {
            throw new UpdateResult.UpdateException(
                "Failed to compute SHA-256: " + ex.getMessage());
        }
    }

    /**
     * JSON shape of the remote catalog manifest.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    record CatalogManifest(
        String catalogVersion,
        int schemaVersion,
        String downloadUrl,
        String sha256
    ) {}

    /**
     * Result of a catalog update check.
     */
    public record UpdateResult(Status status, String version, String message) {

        public enum Status {
            NOT_CONFIGURED,
            UP_TO_DATE,
            UPDATED,
            ERROR
        }

        static UpdateResult notConfigured() {
            return new UpdateResult(Status.NOT_CONFIGURED, null,
                "Catalog update not configured (no manifest URL).");
        }

        static UpdateResult upToDate(final String version) {
            return new UpdateResult(Status.UP_TO_DATE, version,
                "Catalog is already up to date.");
        }

        static UpdateResult updated(final String version) {
            return new UpdateResult(Status.UPDATED, version,
                "Catalog updated to version " + version
                    + ". Restart the application to apply changes.");
        }

        static UpdateResult error(final String errorMessage) {
            return new UpdateResult(Status.ERROR, null, errorMessage);
        }

        /**
         * Internal exception used to short-circuit the update flow with a
         * user-friendly message.
         */
        static class UpdateException extends RuntimeException {
            UpdateException(final String message) {
                super(message);
            }
        }
    }
}
