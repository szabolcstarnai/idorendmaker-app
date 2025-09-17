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

        log.info("🗄️ DataSource configuration:");
        log.info("   JDBC URL: {}", jdbcUrl);

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
        config.addDataSourceProperty("journal_mode", "WAL");
        config.addDataSourceProperty("synchronous", "NORMAL");
        config.setAutoCommit(false);

        config.addDataSourceProperty("read_uncommitted", "true");
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
