package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.version.MigrationCheckResultDto;
import hu.szabolcst.idorendmaker.service.MigrationService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for App Version and Migration operations
 * Handles version tracking, database migrations, and what's new notifications
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/versions")
public class AppVersionController {

    private final MigrationService migrationService;

    /**
     * Check for needed migrations and run them, then return what's new versions
     * This is the main endpoint called by frontend on app startup
     *
     * @param availableVersions List of versions available in migrations.json
     * @return Migration results including versions that ran and unseen what's new
     */
    @PostMapping("/check-and-migrate")
    public ResponseEntity<MigrationCheckResultDto> checkAndRunMigrations(@RequestBody List<String> availableVersions) {
        log.info("POST /api/versions/check-and-migrate - Checking {} available versions", availableVersions.size());

        try {
            MigrationCheckResultDto result = migrationService.checkAndRunMigrations(availableVersions);

            log.info("Migration check completed - migrationsRun: {}, unseenVersions: {}, errors: {}",
                    result.getMigrationsRun().size(),
                    result.getUnseenVersions().size(),
                    result.getErrors().size());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error during migration check and run", e);

            MigrationCheckResultDto errorResult = MigrationCheckResultDto.builder()
                    .migrationsRun(List.of())
                    .unseenVersions(List.of())
                    .errors(List.of("Migration system error: " + e.getMessage()))
                    .build();

            return ResponseEntity.ok(errorResult);
        }
    }

    /**
     * Mark a version's what's new as seen by user
     * Called when user dismisses a what's new modal
     *
     * @param version Version to mark as seen
     * @return Success response
     */
    @PostMapping("/{version}/mark-seen")
    public ResponseEntity<Void> markVersionSeen(@PathVariable String version) {
        log.info("POST /api/versions/{}/mark-seen - Marking version as seen", version);

        try {
            migrationService.markVersionSeen(version);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error marking version as seen: {}", version, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get all versions that have unseen what's new notifications
     * Primarily for debugging/admin purposes
     *
     * @return List of version strings with unseen what's new
     */
    @GetMapping("/unseen")
    public ResponseEntity<List<String>> getUnseenVersions() {
        log.debug("GET /api/versions/unseen - Getting unseen versions");

        try {
            List<String> unseenVersions = migrationService.getUnseenVersions();
            log.debug("Found {} unseen versions", unseenVersions.size());
            return ResponseEntity.ok(unseenVersions);
        } catch (Exception e) {
            log.error("Error getting unseen versions", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Check if version tracking system is enabled
     * Returns true if version tracking table exists
     *
     * @return Boolean indicating if version tracking is enabled
     */
    @GetMapping("/tracking-enabled")
    public ResponseEntity<Boolean> isVersionTrackingEnabled() {
        log.debug("GET /api/versions/tracking-enabled - Checking if version tracking enabled");

        try {
            boolean enabled = migrationService.isVersionTrackingEnabled();
            log.debug("Version tracking enabled: {}", enabled);
            return ResponseEntity.ok(enabled);
        } catch (Exception e) {
            log.error("Error checking version tracking status", e);
            // If we can't check, assume it's not enabled
            return ResponseEntity.ok(false);
        }
    }

}