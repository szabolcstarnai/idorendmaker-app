package hu.szabolcst.idorendmaker.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import hu.szabolcst.idorendmaker.service.DatabasePathResolver;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataSourceConfig {

    private final DatabasePathResolver pathResolver;

    @Bean
    @Primary
    public DataSource dataSource() {
        final String dbPath = pathResolver.resolveDatabasePath();
        final String jdbcUrl = "jdbc:sqlite:" + dbPath;
        log.info("DataSource JDBC URL: {}", jdbcUrl);

        if (!pathResolver.validateDatabasePath()) {
            log.warn("Database validation failed, continuing anyway");
        }

        final HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName("org.sqlite.JDBC");
        config.setMaximumPoolSize(1);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30_000L);
        config.setIdleTimeout(600_000L);
        config.setMaxLifetime(1_800_000L);
        config.setAutoCommit(true);

        // SQLite PRAGMAs applied by xerial at connection open.
        // WAL is the standard recommendation now that GraalVM is gone.
        config.addDataSourceProperty("foreign_keys", "true");
        config.addDataSourceProperty("journal_mode", "WAL");
        config.addDataSourceProperty("synchronous", "NORMAL");
        config.addDataSourceProperty("busy_timeout", "30000");
        config.addDataSourceProperty("cache_size", "10000");
        config.addDataSourceProperty("temp_store", "memory");

        return new HikariDataSource(config);
    }
}
