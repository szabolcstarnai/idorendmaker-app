package hu.szabolcst.idorendmaker.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.util.HashMap;
import java.util.Map;

/**
 * Shared factory for SQLite-backed Hikari pools and the JPA properties that
 * accompany them. Extracted so the catalog and user datasource configs don't
 * have to keep two identical copies of ~40 lines of pool tuning and PRAGMAs
 * in lock-step.
 *
 * <p>Package-private on purpose — only the sibling {@code *DataSourceConfig}
 * classes in this package should call into it.
 */
final class SqliteDataSourceFactory {

    private SqliteDataSourceFactory() {
        // Utility class — no instances.
    }

    /**
     * Builds a {@link HikariDataSource} configured for a single-writer SQLite
     * file with the project's standard PRAGMAs applied at connection open.
     *
     * @param poolName human-readable pool name (shows up in HikariCP logs and
     *                 thread names, making it easy to tell the two pools apart)
     * @param jdbcUrl  full JDBC URL, e.g. {@code jdbc:sqlite:/path/to/file.db}
     */
    static HikariDataSource createPool(final String poolName, final String jdbcUrl) {
        final HikariConfig config = new HikariConfig();
        config.setPoolName(poolName);
        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName("org.sqlite.JDBC");
        config.setMaximumPoolSize(1);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30_000L);
        config.setIdleTimeout(600_000L);
        config.setMaxLifetime(1_800_000L);
        config.setAutoCommit(true);

        // SQLite PRAGMAs applied by xerial at connection open.
        config.addDataSourceProperty("foreign_keys", "true");
        config.addDataSourceProperty("journal_mode", "WAL");
        config.addDataSourceProperty("synchronous", "NORMAL");
        config.addDataSourceProperty("busy_timeout", "30000");
        config.addDataSourceProperty("cache_size", "10000");
        config.addDataSourceProperty("temp_store", "memory");

        return new HikariDataSource(config);
    }

    /**
     * Returns the Hibernate JPA property map shared by both entity manager
     * factories. The goal is to keep Hibernate from probing JDBC metadata on
     * SQLite (which is noisy and slow) and to pin the session time zone.
     */
    static Map<String, Object> jpaProperties() {
        final Map<String, Object> jpaProperties = new HashMap<>();
        jpaProperties.put("hibernate.hbm2ddl.auto", "none");
        jpaProperties.put("hibernate.boot.allow_jdbc_metadata_access", false);
        jpaProperties.put("hibernate.temp.use_jdbc_metadata_defaults", false);
        jpaProperties.put("hibernate.jdbc.time_zone", "UTC");
        return jpaProperties;
    }
}
