package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.AppVersionHistory;
import hu.szabolcst.idorendmaker.repository.AppVersionHistoryRepository;
import hu.szabolcst.idorendmaker.utils.JdbcUtils;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Slf4j
@Repository
public class AppVersionHistoryJdbcRepository extends BaseJdbcRepository implements AppVersionHistoryRepository {

    private static final String TABLE_NAME = "app_version_history";

    private static final String SELECT_ALL = "SELECT * FROM " + TABLE_NAME;
    private static final String SELECT_BY_VERSION = SELECT_ALL + " WHERE version = ?";
    private static final String SELECT_UNSEEN_WHATS_NEW = "SELECT version FROM " + TABLE_NAME + " WHERE migrations_run = 1 AND whats_new_seen = 0";

    private static final String INSERT_SQL = """
        INSERT INTO app_version_history (version, migrations_run, whats_new_seen, migrated_at, seen_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """;

    private static final String UPDATE_SQL = """
        UPDATE app_version_history
        SET migrations_run = ?, whats_new_seen = ?, migrated_at = ?, seen_at = ?
        WHERE version = ?
        """;

    private static final String MARK_MIGRATIONS_RUN_SQL = """
        UPDATE app_version_history
        SET migrations_run = 1, migrated_at = CURRENT_TIMESTAMP
        WHERE version = ?
        """;

    private static final String MARK_WHATS_NEW_SEEN_SQL = """
        UPDATE app_version_history
        SET whats_new_seen = 1, seen_at = CURRENT_TIMESTAMP
        WHERE version = ?
        """;

    public AppVersionHistoryJdbcRepository(JdbcTemplate jdbcTemplate) {
        super(jdbcTemplate);
    }

    @Override
    public boolean versionTrackingTableExists() {
        try {
            // Try to query the table - if it fails, table doesn't exist
            jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + TABLE_NAME, Integer.class);
            return true;
        } catch (DataAccessException e) {
            log.debug("App version history table does not exist: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public Optional<AppVersionHistory> findByVersion(String version) {
        try {
            AppVersionHistory versionHistory = jdbcTemplate.queryForObject(
                    SELECT_BY_VERSION,
                    new AppVersionHistoryRowMapper(),
                    version
            );
            return Optional.ofNullable(versionHistory);
        } catch (DataAccessException e) {
            log.debug("Version history not found for version: {}", version);
            return Optional.empty();
        }
    }

    @Override
    public List<AppVersionHistory> findAll() {
        return jdbcTemplate.query(SELECT_ALL, new AppVersionHistoryRowMapper());
    }

    @Override
    public List<String> findVersionsWithUnseenWhatsNew() {
        return jdbcTemplate.queryForList(SELECT_UNSEEN_WHATS_NEW, String.class);
    }

    @Override
    public AppVersionHistory save(AppVersionHistory versionHistory) {
        if (findByVersion(versionHistory.getVersion()).isPresent()) {
            // Update existing
            jdbcTemplate.update(
                    UPDATE_SQL,
                    versionHistory.getMigrationsRun(),
                    versionHistory.getWhatsNewSeen(),
                    versionHistory.getMigratedAt(),
                    versionHistory.getSeenAt(),
                    versionHistory.getVersion()
            );
        } else {
            // Insert new
            jdbcTemplate.update(
                    INSERT_SQL,
                    versionHistory.getVersion(),
                    versionHistory.getMigrationsRun(),
                    versionHistory.getWhatsNewSeen(),
                    versionHistory.getMigratedAt(),
                    versionHistory.getSeenAt(),
                    versionHistory.getCreatedAt()
            );

            // Set ID for new records (SQLite auto-increment)
            Integer id = jdbcTemplate.queryForObject("SELECT last_insert_rowid()", Integer.class);
            versionHistory.setId(id);
        }

        return versionHistory;
    }

    @Override
    public void markMigrationsRun(String version) {
        int updated = jdbcTemplate.update(MARK_MIGRATIONS_RUN_SQL, version);
        if (updated == 0) {
            // Create new record if it doesn't exist
            AppVersionHistory versionHistory = new AppVersionHistory(version);
            versionHistory.setMigrationsRun(true);
            versionHistory.setMigratedAt(LocalDateTime.now());
            save(versionHistory);
        }
        log.info("Marked migrations as run for version: {}", version);
    }

    @Override
    public void markWhatsNewSeen(String version) {
        int updated = jdbcTemplate.update(MARK_WHATS_NEW_SEEN_SQL, version);
        if (updated == 0) {
            log.warn("No version history found to mark what's new as seen for version: {}", version);
        } else {
            log.info("Marked what's new as seen for version: {}", version);
        }
    }

    @Override
    public void executeRawSql(String sql) {
        try {
            jdbcTemplate.execute(sql);
            log.debug("Executed SQL: {}", sql);
        } catch (DataAccessException e) {
            log.error("Failed to execute SQL: {}", sql, e);
            throw e;
        }
    }

    private static class AppVersionHistoryRowMapper implements RowMapper<AppVersionHistory> {
        @Override
        public AppVersionHistory mapRow(ResultSet rs, int rowNum) throws SQLException {
            AppVersionHistory versionHistory = new AppVersionHistory();

            versionHistory.setId(JdbcUtils.getNullableInt(rs, "id"));
            versionHistory.setVersion(rs.getString("version"));
            versionHistory.setMigrationsRun(rs.getBoolean("migrations_run"));
            versionHistory.setWhatsNewSeen(rs.getBoolean("whats_new_seen"));
            versionHistory.setMigratedAt(JdbcUtils.getNullableLocalDateTime(rs, "migrated_at"));
            versionHistory.setSeenAt(JdbcUtils.getNullableLocalDateTime(rs, "seen_at"));
            versionHistory.setCreatedAt(JdbcUtils.getNullableLocalDateTime(rs, "created_at"));

            return versionHistory;
        }
    }

}