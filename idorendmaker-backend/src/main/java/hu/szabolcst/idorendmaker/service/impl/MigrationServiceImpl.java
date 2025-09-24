package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.model.dto.version.MigrationCheckResultDto;
import hu.szabolcst.idorendmaker.repository.AppVersionHistoryRepository;
import hu.szabolcst.idorendmaker.service.MigrationService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MigrationServiceImpl implements MigrationService {

    private final AppVersionHistoryRepository versionHistoryRepository;

    @Override
    public MigrationCheckResultDto checkAndRunMigrations(List<String> availableVersions) {
        log.info("Starting migration check for versions: {}", availableVersions);

        List<String> migrationsRun = new ArrayList<>();
        List<String> unseenVersions = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try {
            if (!versionHistoryRepository.versionTrackingTableExists()) {
                // Bootstrap scenario - first run
                log.info("Version tracking table does not exist - bootstrapping system");
                return bootstrapVersionTracking(availableVersions);
            }

            // Normal scenario - check existing installation
            return checkExistingInstallation(availableVersions);

        } catch (Exception e) {
            log.error("Error during migration check and execution", e);
            errors.add("Migration system error: " + e.getMessage());
            return MigrationCheckResultDto.builder()
                    .migrationsRun(migrationsRun)
                    .unseenVersions(unseenVersions)
                    .errors(errors)
                    .build();
        }
    }

    private MigrationCheckResultDto bootstrapVersionTracking(List<String> availableVersions) {
        log.info("Bootstrapping version tracking system");

        List<String> migrationsRun = new ArrayList<>();
        List<String> unseenVersions = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try {
            // Get the latest version (assumes semantic versioning)
            String currentVersion = getLatestVersion(availableVersions);
            log.info("Bootstrap: using latest version as current: {}", currentVersion);

            // Run migrations for the current version to create the table
            boolean migrationSuccess = runMigrationsForVersion(currentVersion);

            if (migrationSuccess) {
                migrationsRun.add(currentVersion);
                // Mark as migrated in the newly created table
                versionHistoryRepository.markMigrationsRun(currentVersion);
                // User should see what's new for this version
                unseenVersions.add(currentVersion);
                log.info("Bootstrap completed successfully for version: {}", currentVersion);
            } else {
                errors.add("Failed to run bootstrap migrations for version: " + currentVersion);
            }

        } catch (Exception e) {
            log.error("Error during bootstrap", e);
            errors.add("Bootstrap error: " + e.getMessage());
        }

        return MigrationCheckResultDto.builder()
                .migrationsRun(migrationsRun)
                .unseenVersions(unseenVersions)
                .errors(errors)
                .build();
    }

    private MigrationCheckResultDto checkExistingInstallation(List<String> availableVersions) {
        log.info("Checking existing installation for needed migrations");

        List<String> migrationsRun = new ArrayList<>();
        List<String> unseenVersions = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        try {
            // Get versions that need migrations run
            List<String> versionsNeedingMigrations = getVersionsNeedingMigrations(availableVersions);

            // Run migrations for each version
            for (String version : versionsNeedingMigrations) {
                try {
                    boolean migrationSuccess = runMigrationsForVersion(version);
                    if (migrationSuccess) {
                        migrationsRun.add(version);
                        versionHistoryRepository.markMigrationsRun(version);
                        log.info("Successfully ran migrations for version: {}", version);
                    } else {
                        errors.add("Failed to run migrations for version: " + version);
                    }
                } catch (Exception e) {
                    log.error("Error running migrations for version: {}", version, e);
                    errors.add("Migration error for version " + version + ": " + e.getMessage());
                }
            }

            // Get versions with unseen what's new (including newly migrated)
            unseenVersions = versionHistoryRepository.findVersionsWithUnseenWhatsNew();

            // Add any newly migrated versions to unseen list
            for (String migratedVersion : migrationsRun) {
                if (!unseenVersions.contains(migratedVersion)) {
                    unseenVersions.add(migratedVersion);
                }
            }

            // Sort unseen versions chronologically
            unseenVersions.sort(this::compareVersions);

        } catch (Exception e) {
            log.error("Error during existing installation check", e);
            errors.add("Installation check error: " + e.getMessage());
        }

        return MigrationCheckResultDto.builder()
                .migrationsRun(migrationsRun)
                .unseenVersions(unseenVersions)
                .errors(errors)
                .build();
    }

    private List<String> getVersionsNeedingMigrations(List<String> availableVersions) {
        List<String> versionsNeedingMigrations = new ArrayList<>();

        for (String version : availableVersions) {
            if (!versionHistoryRepository.findByVersion(version).isPresent()) {
                // Version not in history - needs migration
                versionsNeedingMigrations.add(version);
            }
        }

        // Sort chronologically to run migrations in order
        versionsNeedingMigrations.sort(this::compareVersions);
        return versionsNeedingMigrations;
    }

    /**
     * Execute migrations for a specific version by parsing hardcoded migration data
     * In a real implementation, this would read from migrations.json via a resource reader
     */
    private boolean runMigrationsForVersion(String version) {
        log.info("Running migrations for version: {}", version);

        try {
            // Hardcoded migration for 1.0.0 (version tracking bootstrap)
            if ("1.0.0".equals(version)) {
                List<String> migrations = List.of(
                    "CREATE TABLE IF NOT EXISTS app_version_history (id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT NOT NULL UNIQUE, migrations_run BOOLEAN NOT NULL DEFAULT 0, whats_new_seen BOOLEAN NOT NULL DEFAULT 0, migrated_at DATETIME, seen_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);",
                    "CREATE INDEX IF NOT EXISTS idx_app_version_history_version ON app_version_history(version);",
                    "CREATE INDEX IF NOT EXISTS idx_app_version_history_migrations_run ON app_version_history(migrations_run);",
                    "CREATE INDEX IF NOT EXISTS idx_app_version_history_whats_new_seen ON app_version_history(whats_new_seen);"
                );

                for (String migration : migrations) {
                    versionHistoryRepository.executeRawSql(migration);
                }

                log.info("Successfully executed {} migrations for version {}", migrations.size(), version);
                return true;
            }

            // For future versions, migrations would be loaded from JSON
            log.warn("No migrations found for version: {} - this is expected for versions without schema changes", version);
            return true;

        } catch (Exception e) {
            log.error("Failed to run migrations for version: {}", version, e);
            return false;
        }
    }

    @Override
    public void markVersionSeen(String version) {
        log.info("Marking version as seen: {}", version);
        versionHistoryRepository.markWhatsNewSeen(version);
    }

    @Override
    public List<String> getUnseenVersions() {
        return versionHistoryRepository.findVersionsWithUnseenWhatsNew();
    }

    @Override
    public boolean isVersionTrackingEnabled() {
        return versionHistoryRepository.versionTrackingTableExists();
    }

    /**
     * Get the latest version from available versions using semantic versioning comparison
     */
    private String getLatestVersion(List<String> versions) {
        return versions.stream()
                .max(this::compareVersions)
                .orElse("1.0.0");
    }

    /**
     * Compare two version strings using semantic versioning rules
     * Returns negative if v1 < v2, positive if v1 > v2, zero if equal
     */
    private int compareVersions(String v1, String v2) {
        try {
            String[] parts1 = v1.split("\\.");
            String[] parts2 = v2.split("\\.");

            int maxLength = Math.max(parts1.length, parts2.length);

            for (int i = 0; i < maxLength; i++) {
                int num1 = i < parts1.length ? Integer.parseInt(parts1[i]) : 0;
                int num2 = i < parts2.length ? Integer.parseInt(parts2[i]) : 0;

                int result = Integer.compare(num1, num2);
                if (result != 0) {
                    return result;
                }
            }

            return 0;
        } catch (NumberFormatException e) {
            // Fallback to string comparison
            return v1.compareTo(v2);
        }
    }

}