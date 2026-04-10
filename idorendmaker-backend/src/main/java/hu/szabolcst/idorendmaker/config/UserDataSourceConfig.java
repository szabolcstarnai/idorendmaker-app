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
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * JPA configuration for the user database (read/write). This is the primary
 * datasource — Spring's Liquibase autoconfiguration targets it via the
 * {@link LiquibaseDataSource} qualifier bean below.
 *
 * <p>In Phase 1 the user entity manager still scans the existing flat
 * {@code hu.szabolcst.idorendmaker.model.entity} package because all entities
 * live there. Phase 3 will split entities into {@code .user} and {@code .catalog}
 * subpackages and this scan will be narrowed to {@code .user}.
 *
 * <p>Repository scanning excludes anything under {@code repository.catalog.*}
 * so that future catalog repositories bind to the catalog EMF instead.
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
        // Phase 1: still scan the flat entity package. Phase 3 narrows to `.user`.
        emf.setPackagesToScan("hu.szabolcst.idorendmaker.model.entity");

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
