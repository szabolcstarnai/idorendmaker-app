package hu.szabolcst.idorendmaker.config;

import hu.szabolcst.idorendmaker.service.DatabasePathResolver;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.liquibase.LiquibaseDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan.Filter;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Primary;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.persistenceunit.PersistenceUnitPostProcessor;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * JPA configuration for the user database (read/write). This is the primary
 * datasource — Spring's Liquibase autoconfiguration targets it via the
 * {@link LiquibaseDataSource} qualifier bean below.
 *
 * <p>The user entity manager scans the flat {@code model.entity} package
 * recursively and uses a {@link PersistenceUnitPostProcessor} to strip out
 * the {@code .catalog} subpackage so its entities bind only to the catalog
 * EMF. A later phase will move user entities into a dedicated {@code .user}
 * subpackage so the scan can be narrowed and the post-processor removed.
 *
 * <p>Repository scanning excludes anything under {@code repository.catalog.*}
 * so catalog repositories bind to the catalog EMF instead.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@EnableJpaRepositories(
    basePackages = "hu.szabolcst.idorendmaker.repository",
    excludeFilters = {
        @Filter(
            type = FilterType.REGEX,
            pattern = "hu\\.szabolcst\\.idorendmaker\\.repository\\.catalog\\..*"
        )
    },
    entityManagerFactoryRef = "userEntityManagerFactory",
    transactionManagerRef = "userTransactionManager"
)
public class UserDataSourceConfig {

    private final DatabasePathResolver pathResolver;

    @Bean(name = "userDataSource")
    @Primary
    public DataSource userDataSource() {
        final String dbPath = pathResolver.resolveUserDbPath();
        final String jdbcUrl = "jdbc:sqlite:" + dbPath;
        log.info("userDataSource JDBC URL: {}", jdbcUrl);
        return SqliteDataSourceFactory.createPool("user-pool", jdbcUrl);
    }

    @Bean(name = "userEntityManagerFactory")
    @Primary
    public LocalContainerEntityManagerFactoryBean userEntityManagerFactory() {
        final LocalContainerEntityManagerFactoryBean emf = new LocalContainerEntityManagerFactoryBean();
        emf.setDataSource(userDataSource());
        emf.setPersistenceUnitName("user");
        // Scan the flat entity package recursively, then strip out anything under
        // the `.catalog` subpackage so the new catalog entities bind only to the
        // catalog EMF. This allows both EMFs to coexist during the migration.
        // TODO: once user entities are moved into model.entity.user, narrow the
        // scan to that subpackage and delete this post-processor.
        emf.setPackagesToScan("hu.szabolcst.idorendmaker.model.entity");
        emf.setPersistenceUnitPostProcessors((PersistenceUnitPostProcessor) pui -> {
            final String catalogPrefix = "hu.szabolcst.idorendmaker.model.entity.catalog.";
            pui.getManagedClassNames().removeIf(className -> className.startsWith(catalogPrefix));
        });

        final HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setDatabasePlatform("org.hibernate.community.dialect.SQLiteDialect");
        emf.setJpaVendorAdapter(vendorAdapter);

        emf.setJpaPropertyMap(SqliteDataSourceFactory.jpaProperties());

        return emf;
    }

    @Bean(name = "userTransactionManager")
    @Primary
    public PlatformTransactionManager userTransactionManager() {
        final JpaTransactionManager tm = new JpaTransactionManager();
        tm.setEntityManagerFactory(userEntityManagerFactory().getObject());
        return tm;
    }

    /**
     * Qualifier bean so Spring Boot's Liquibase autoconfig targets user.db
     * rather than guessing via {@code @Primary}. Without this, Liquibase would
     * still pick the primary datasource and work by coincidence; with it, the
     * intent is explicit.
     */
    @Bean
    @LiquibaseDataSource
    public DataSource liquibaseDataSource() {
        return userDataSource();
    }
}
