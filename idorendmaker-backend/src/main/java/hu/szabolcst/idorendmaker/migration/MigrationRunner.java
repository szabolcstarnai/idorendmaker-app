package hu.szabolcst.idorendmaker.migration;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

/**
 * Custom SQL migration runner for database schema updates.
 *
 * Executes SQL migration files from classpath:db/migrations/ directory.
 * Tracks applied migrations in schema_migrations table.
 * GraalVM native image compatible - no reflection, pure JDBC.
 */
@Slf4j
@Component
@Order(1) // Run early in application startup
public class MigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final boolean migrationEnabled;
    private final String migrationLocations;

    @Autowired
    public MigrationRunner(
        final JdbcTemplate jdbcTemplate,
        @Value("${app.migration.enabled:true}") final boolean migrationEnabled,
        @Value("${app.migration.locations:classpath:db/migrations}") final String migrationLocations
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.migrationEnabled = migrationEnabled;
        this.migrationLocations = migrationLocations;
    }

    @Override
    public void run(final String... args) {
        if (!migrationEnabled) {
            log.info("🚫 Database migrations are disabled (app.migration.enabled=false)");
            return;
        }

        log.info("🚀 Starting database migration runner...");
        log.info("📂 Migration location: {}", migrationLocations);

        try {
            // Step 1: Ensure migration tracking table exists
            ensureMigrationTableExists();

            // Step 2: Load migration files from classpath
            final List<Migration> availableMigrations = loadMigrationFiles();
            log.info("📊 Found {} migration file(s)", availableMigrations.size());

            if (availableMigrations.isEmpty()) {
                log.info("✅ No migration files found - database is up to date");
                return;
            }

            // Step 3: Get already applied migrations
            final Set<String> appliedVersions = getAppliedMigrations();
            log.info("📋 Previously applied: {} migration(s)", appliedVersions.size());

            // Step 4: Filter pending migrations
            final List<Migration> pendingMigrations = availableMigrations.stream()
                .filter(m -> !appliedVersions.contains(m.version()))
                .sorted()
                .collect(Collectors.toList());

            if (pendingMigrations.isEmpty()) {
                log.info("✅ Database is up to date - no pending migrations");
                return;
            }

            log.info("🔄 Applying {} pending migration(s)...", pendingMigrations.size());

            // Step 5: Apply pending migrations
            for (final Migration migration : pendingMigrations) {
                applyMigration(migration);
            }

            log.info("🎉 Database migration completed successfully!");

        } catch (final Exception e) {
            log.error("❌ Database migration failed", e);
            throw new RuntimeException("Database migration failed: " + e.getMessage(), e);
        }
    }

    /**
     * Creates the schema_migrations table if it doesn't exist.
     */
    private void ensureMigrationTableExists() {
        log.debug("🔧 Ensuring schema_migrations table exists...");

        final String createTableSql = """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(255) PRIMARY KEY,
                description VARCHAR(500),
                script_name VARCHAR(255) NOT NULL,
                installed_on DATETIME DEFAULT CURRENT_TIMESTAMP,
                execution_time_ms INTEGER,
                success BOOLEAN DEFAULT 1
            )
            """;

        jdbcTemplate.execute(createTableSql);
        log.debug("✅ schema_migrations table ready");
    }

    /**
     * Loads all migration files from the configured location.
     */
    private List<Migration> loadMigrationFiles() throws Exception {
        log.debug("📖 Scanning for migration files...");

        final PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        final String pattern = migrationLocations.replace("classpath:", "classpath*:") + "/*.sql";
        final Resource[] resources = resolver.getResources(pattern);

        final List<Migration> migrations = new ArrayList<>();

        for (final Resource resource : resources) {
            final String filename = resource.getFilename();
            if (filename == null || !filename.startsWith("V")) {
                log.warn("⚠️ Skipping non-migration file: {}", filename);
                continue;
            }

            try {
                final String content = readResourceContent(resource);
                final Migration migration = Migration.fromResource(filename, content);
                migrations.add(migration);
                log.debug("📄 Loaded migration: {} - {}", migration.version(), migration.description());
            } catch (final Exception e) {
                log.error("❌ Failed to load migration file: {}", filename, e);
                throw new RuntimeException("Failed to load migration: " + filename, e);
            }
        }

        Collections.sort(migrations);
        return migrations;
    }

    /**
     * Reads the content of a migration file resource.
     */
    private String readResourceContent(final Resource resource) throws Exception {
        try (final BufferedReader reader = new BufferedReader(
            new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.joining("\n"));
        }
    }

    /**
     * Gets the set of already applied migration versions.
     */
    private Set<String> getAppliedMigrations() {
        log.debug("🔍 Checking applied migrations...");

        final String sql = "SELECT version FROM schema_migrations WHERE success = 1 ORDER BY version";

        final List<String> versions = jdbcTemplate.queryForList(sql, String.class);
        return new HashSet<>(versions);
    }

    /**
     * Applies a single migration.
     *
     * Note: NOT @Transactional because:
     * 1. Migration SQL manages its own transactions (BEGIN/COMMIT)
     * 2. PRAGMA statements must execute outside transactions
     * 3. ScriptUtils handles multi-statement execution properly
     */
    protected void applyMigration(final Migration migration) {
        log.info("⏳ Applying migration: {} - {}", migration.version(), migration.description());

        final long startTime = System.currentTimeMillis();

        try {
            // Execute the migration SQL script (multiple statements)
            // Use ScriptUtils which properly handles multi-statement SQL files
            try (final Connection connection = jdbcTemplate.getDataSource().getConnection()) {
                final ByteArrayResource resource = new ByteArrayResource(
                    migration.content().getBytes(StandardCharsets.UTF_8)
                );
                final EncodedResource encodedResource = new EncodedResource(resource, StandardCharsets.UTF_8);

                ScriptUtils.executeSqlScript(connection, encodedResource);
            }

            final long executionTime = System.currentTimeMillis() - startTime;

            // Record successful migration
            final String insertSql = """
                INSERT INTO schema_migrations (version, description, script_name, execution_time_ms, success)
                VALUES (?, ?, ?, ?, 1)
                """;

            jdbcTemplate.update(
                insertSql,
                migration.version(),
                migration.description(),
                migration.scriptName(),
                executionTime
            );

            log.info("✅ Migration applied successfully: {} ({}ms)", migration.scriptName(), executionTime);

        } catch (final Exception e) {
            log.error("❌ Migration failed: {} - {}", migration.scriptName(), e.getMessage(), e);

            // Record failed migration attempt
            try {
                final String insertSql = """
                    INSERT INTO schema_migrations (version, description, script_name, execution_time_ms, success)
                    VALUES (?, ?, ?, ?, 0)
                    """;

                jdbcTemplate.update(
                    insertSql,
                    migration.version(),
                    migration.description(),
                    migration.scriptName(),
                    System.currentTimeMillis() - startTime
                );
            } catch (final Exception recordError) {
                log.warn("⚠️ Failed to record migration failure: {}", recordError.getMessage());
            }

            throw new RuntimeException("Migration failed: " + migration.scriptName(), e);
        }
    }
}
