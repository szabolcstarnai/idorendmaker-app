package hu.szabolcst.idorendmaker.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import hu.szabolcst.idorendmaker.service.DatabasePathResolver;
import java.util.HashMap;
import java.util.Map;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * JPA configuration for the catalog database (read-only at runtime, rewritten
 * only by the catalog update service).
 *
 * <p>Scans {@code hu.szabolcst.idorendmaker.repository.catalog} (which does not
 * exist yet in Phase 1) and {@code hu.szabolcst.idorendmaker.model.entity.catalog}
 * (also empty in Phase 1). Both packages will be populated in later phases.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@EnableJpaRepositories(
    basePackages = "hu.szabolcst.idorendmaker.repository.catalog",
    entityManagerFactoryRef = "catalogEntityManagerFactory",
    transactionManagerRef = "catalogTransactionManager"
)
public class CatalogDataSourceConfig {

    private final DatabasePathResolver pathResolver;

    @Bean(name = "catalogDataSource")
    @DependsOn("catalogBootstrapService")
    public DataSource catalogDataSource() {
        final String dbPath = pathResolver.resolveCatalogDbPath();
        final String jdbcUrl = "jdbc:sqlite:" + dbPath;
        log.info("catalogDataSource JDBC URL: {}", jdbcUrl);

        final HikariConfig config = new HikariConfig();
        config.setPoolName("catalogDataSource");
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

    @Bean(name = "catalogEntityManagerFactory")
    public LocalContainerEntityManagerFactoryBean catalogEntityManagerFactory() {
        final LocalContainerEntityManagerFactoryBean emf = new LocalContainerEntityManagerFactoryBean();
        emf.setDataSource(catalogDataSource());
        emf.setPersistenceUnitName("catalog");
        emf.setPackagesToScan("hu.szabolcst.idorendmaker.model.entity.catalog");

        final HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setDatabasePlatform("org.hibernate.community.dialect.SQLiteDialect");
        emf.setJpaVendorAdapter(vendorAdapter);

        final Map<String, Object> jpaProperties = new HashMap<>();
        jpaProperties.put("hibernate.hbm2ddl.auto", "none");
        jpaProperties.put("hibernate.boot.allow_jdbc_metadata_access", false);
        jpaProperties.put("hibernate.temp.use_jdbc_metadata_defaults", false);
        jpaProperties.put("hibernate.jdbc.time_zone", "UTC");
        emf.setJpaPropertyMap(jpaProperties);

        return emf;
    }

    @Bean(name = "catalogTransactionManager")
    public PlatformTransactionManager catalogTransactionManager() {
        final JpaTransactionManager tm = new JpaTransactionManager();
        tm.setEntityManagerFactory(catalogEntityManagerFactory().getObject());
        return tm;
    }
}
