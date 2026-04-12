package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.service.CatalogUpdateService;
import hu.szabolcst.idorendmaker.service.CatalogUpdateService.UpdateResult;
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

    /**
     * Returns the catalog metadata rows: schema_version, catalog_version,
     * generated_at, plus a restart_required flag from the update service.
     */
    @GetMapping("/version")
    public ResponseEntity<Map<String, Object>> getCatalogVersion() {
        log.debug("GET /api/catalog/version");

        final Map<String, Object> result = catalogUpdateService.getCatalogVersionInfo();

        if (result.containsKey("error")) {
            return ResponseEntity.internalServerError().body(result);
        }
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
