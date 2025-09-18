package hu.szabolcst.idorendmaker.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import hu.szabolcst.idorendmaker.service.DatabasePathResolver;
import javax.sql.DataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.PlatformTransactionManager;

@Slf4j
@Configuration
public class DataSourceConfig {

    private final DatabasePathResolver pathResolver;

    @Autowired
    public DataSourceConfig(final DatabasePathResolver pathResolver) {
        this.pathResolver = pathResolver;
    }

    @Bean
    @Primary
    public DataSource dataSource() {
        final String dbPath = this.pathResolver.resolveDatabasePath();
        final String jdbcUrl = "jdbc:sqlite:" + dbPath;

        log.info("🗄️ DataSource configuration (GraalVM UPDATE fixes applied):");
        log.info("   JDBC URL: {}", jdbcUrl);
        log.info("   Journal Mode: DELETE (changed from WAL for GraalVM UPDATE compatibility)");
        log.info("   AutoCommit: true (enabled for GraalVM UPDATE operations)");
        log.info("   Synchronous: FULL (enhanced for UPDATE reliability)");

        final boolean isValid = this.pathResolver.validateDatabasePath();
        if (!isValid) {
            log.warn("⚠️ Database validation failed, but continuing with configuration");
        }

        final HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setDriverClassName("org.sqlite.JDBC");

        config.setConnectionTestQuery("SELECT 1");
        config.setMaximumPoolSize(1);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(30000L);
        config.setIdleTimeout(600000L);
        config.setMaxLifetime(1800000L);
        config.setLeakDetectionThreshold(60000L);

        config.setReadOnly(false);

        config.addDataSourceProperty("foreign_keys", "true");

        // GraalVM Fix: Change journal mode from WAL to DELETE for UPDATE compatibility
        // WAL mode can cause issues with UPDATE operations in GraalVM native builds
        config.addDataSourceProperty("journal_mode", "DELETE");

        // GraalVM Fix: Change synchronous to FULL for UPDATE reliability
        config.addDataSourceProperty("synchronous", "FULL");

        // GraalVM Fix: Enable autocommit for UPDATE operations to work properly
        config.setAutoCommit(true);

        // GraalVM Fix: Additional SQLite settings for UPDATE operations
        config.addDataSourceProperty("cache_size", "10000");
        config.addDataSourceProperty("temp_store", "memory");
        config.addDataSourceProperty("locking_mode", "NORMAL");
        config.addDataSourceProperty("busy_timeout", "30000");

        config.addDataSourceProperty("enable_load_extension", "false");

        return new HikariDataSource(config);
    }

    @Bean
    @Primary
    public PlatformTransactionManager transactionManager(final DataSource dataSource) {
        log.info("🔄 Creating SQLite-aware transaction manager");
        return new SQLiteDataSourceTransactionManager(dataSource);
    }
}
