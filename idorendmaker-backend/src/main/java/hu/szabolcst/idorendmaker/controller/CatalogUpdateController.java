package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.service.CatalogUpdateService;
import hu.szabolcst.idorendmaker.service.CatalogUpdateService.UpdateResult;
import hu.szabolcst.idorendmaker.service.DatabasePathResolver;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for catalog version info and update operations.
 * All endpoints are user-triggered (no automatic polling).
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/catalog")
public class CatalogUpdateController {

    private final CatalogUpdateService catalogUpdateService;
    private final DatabasePathResolver pathResolver;

    /**
     * Returns the catalog metadata rows: schema_version, catalog_version,
     * generated_at, plus a restart_required flag from the update service.
     */
    @GetMapping("/version")
    public ResponseEntity<Map<String, Object>> getCatalogVersion() {
        log.debug("GET /api/catalog/version");

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
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "Failed to read catalog metadata: " + ex.getMessage()));
        }

        result.put("restart_required", catalogUpdateService.isRestartRequired());
        return ResponseEntity.ok(result);
    }

    /**
     * Triggers a catalog update check. Downloads and stages the new catalog
     * if available. Returns the result of the check.
     */
    @PostMapping("/check-update")
    public ResponseEntity<UpdateResult> checkForUpdate() {
        log.info("POST /api/catalog/check-update");

        final UpdateResult result = catalogUpdateService.checkAndUpdate();
        log.info("Catalog update result: status={}, message={}", result.status(), result.message());

        return ResponseEntity.ok(result);
    }
}
