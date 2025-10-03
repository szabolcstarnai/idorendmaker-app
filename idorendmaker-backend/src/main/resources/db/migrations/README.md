# Database Migrations

This directory contains SQL migration files that are automatically executed on application startup.

## Migration File Naming Convention

Migration files must follow this naming pattern:

```
V{timestamp}__{description}.sql
```

**Examples:**
- `V20250101120530__update_races.sql`
- `V20250115093000__add_new_boat_classes.sql`
- `V20250220145500__update_occurrence_counts.sql`

## How It Works

1. **Automatic Execution**: Migrations run automatically when the backend starts
2. **Ordered Execution**: Files are executed in version order (timestamp)
3. **Tracking**: Applied migrations are recorded in `schema_migrations` table
4. **Idempotent**: Already-applied migrations are skipped
5. **Transaction Safety**: Each migration runs in its own transaction
6. **Fail-Fast**: If a migration fails, the application won't start

## Generating Migrations

Use the `generate-migration` script in `idorendmaker-db-populator`:

```bash
cd idorendmaker-db-populator
npm run generate-migration -- --old=../documents/versenyszamok_old.xlsx --new=../documents/versenyszamok.xlsx
```

This creates a migration SQL file in `idorendmaker-db-populator/migrations/`.

**Copy the generated file** to this directory (`idorendmaker-backend/src/main/resources/db/migrations/`).

## Configuration

Migrations can be configured in `application.properties`:

```properties
# Enable/disable migrations
app.migration.enabled=true

# Migration files location
app.migration.locations=classpath:db/migrations
```

## schema_migrations Table

The migration system creates and maintains this table:

```sql
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,      -- Migration version (timestamp)
    description VARCHAR(500),               -- Human-readable description
    script_name VARCHAR(255) NOT NULL,     -- Original filename
    installed_on DATETIME DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,             -- How long it took to run
    success BOOLEAN DEFAULT 1              -- 1 = success, 0 = failed
);
```

## Best Practices

1. **Never modify** an already-applied migration file
2. **Always create new** migration files for schema changes
3. **Test migrations** on a copy of the database first
4. **Use transactions** within migration SQL if needed (BEGIN/COMMIT)
5. **Keep migrations small** and focused on one change
6. **Version control** all migration files

## Example Migration File

```sql
-- Migration generated on 2025-01-15T09:30:00
-- Summary: Update occurrence counts for popular races

BEGIN TRANSACTION;

-- Update existing races
UPDATE races SET occurrence = 15 WHERE name = 'Férfi kajak egyes 200m';
UPDATE races SET occurrence = 12 WHERE name = 'Női kajak egyes 500m';

-- Insert new races
INSERT INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
VALUES ('Férfi kenu egyes 5000m', 'Kenu', 'Kenu egyes', 'Férfi', '5000m', 3, 0);

INSERT OR IGNORE INTO age_groups (name) VALUES ('U19');

INSERT INTO race_age_groups (race_id, age_group_id)
SELECT r.id, ag.id FROM races r, age_groups ag
WHERE r.name = 'Férfi kenu egyes 5000m' AND ag.name = 'U19';

COMMIT;
```
