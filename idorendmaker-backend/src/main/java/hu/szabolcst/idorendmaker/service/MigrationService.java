package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.version.MigrationCheckResultDto;
import java.util.List;

public interface MigrationService {

    /**
     * Check for needed migrations and run them, then return what's new versions
     * Main orchestration method called by frontend
     */
    MigrationCheckResultDto checkAndRunMigrations(List<String> availableVersions);

    /**
     * Mark a version's what's new as seen by user
     */
    void markVersionSeen(String version);

    /**
     * Get all versions that have unseen what's new notifications
     */
    List<String> getUnseenVersions();

    /**
     * Check if version tracking table exists (bootstrap detection)
     */
    boolean isVersionTrackingEnabled();

}