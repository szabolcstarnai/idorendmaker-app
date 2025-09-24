package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.AppVersionHistory;
import java.util.List;
import java.util.Optional;

public interface AppVersionHistoryRepository {

    /**
     * Check if app version history table exists
     * Used for bootstrap detection
     */
    boolean versionTrackingTableExists();

    /**
     * Find version history record by version string
     */
    Optional<AppVersionHistory> findByVersion(String version);

    /**
     * Get all version history records
     */
    List<AppVersionHistory> findAll();

    /**
     * Get all versions that have migrations run but what's new not seen
     */
    List<String> findVersionsWithUnseenWhatsNew();

    /**
     * Save or update version history record
     */
    AppVersionHistory save(AppVersionHistory versionHistory);

    /**
     * Mark version migrations as run
     */
    void markMigrationsRun(String version);

    /**
     * Mark version what's new as seen
     */
    void markWhatsNewSeen(String version);

    /**
     * Execute raw SQL statement (for migrations)
     */
    void executeRawSql(String sql);

}