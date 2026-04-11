package hu.szabolcst.idorendmaker.config;

import hu.szabolcst.idorendmaker.service.CatalogBootstrapService;
import hu.szabolcst.idorendmaker.service.DatabasePathResolver;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;
import org.springframework.context.annotation.FullyQualifiedAnnotationBeanNameGenerator;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * JPA configuration for the catalog database (read-only at runtime, rewritten
 * only by the catalog update service).
 *
 * <p>Scans {@code hu.szabolcst.idorendmaker.repository.catalog} for repositories
 * and {@code hu.szabolcst.idorendmaker.model.entity.catalog} for entities. Uses
 * a fully-qualified bean name generator so the catalog repositories do not
 * collide with the legacy {@code repository.*} simple-name beans that are still
 * wired into the user EMF during this migration.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
@EnableJpaRepositories(
    basePackages = "hu.szabolcst.idorendmaker.repository.catalog",
    entityManagerFactoryRef = "catalogEntityManagerFactory",
    transactionManagerRef = "catalogTransactionManager",
    // Use fully-qualified bean names on the catalog side so the new catalog
    // repositories (e.g. repository.catalog.AgeGroupRepository) do not clash
    // with the legacy simple-name-derived beans from repository.AgeGroupRepository
    // that are still wired into the user EMF during this migration phase.
    nameGenerator = FullyQualifiedAnnotationBeanNameGenerator.class
)
public class CatalogDataSourceConfig {

    private final DatabasePathResolver pathResolver;

    @Bean(name = "catalogDataSource")
    @DependsOn(CatalogBootstrapService.BEAN_NAME)
    public DataSource catalogDataSource() {
        final String dbPath = pathResolver.resolveCatalogDbPath();
        final String jdbcUrl = "jdbc:sqlite:" + dbPath;
        log.info("catalogDataSource JDBC URL: {}", jdbcUrl);
        return SqliteDataSourceFactory.createPool("catalog-pool", jdbcUrl);
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

        emf.setJpaPropertyMap(SqliteDataSourceFactory.jpaProperties());

        return emf;
    }

    @Bean(name = "catalogTransactionManager")
    public PlatformTransactionManager catalogTransactionManager() {
        final JpaTransactionManager tm = new JpaTransactionManager();
        tm.setEntityManagerFactory(catalogEntityManagerFactory().getObject());
        return tm;
    }
}
