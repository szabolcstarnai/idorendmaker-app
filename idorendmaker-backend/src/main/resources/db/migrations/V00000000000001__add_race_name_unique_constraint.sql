-- Migration: Add UNIQUE constraint to races.name
-- For existing databases (updates)
-- Fresh installs already have this constraint in schema.sql

-- IMPORTANT: Disable foreign keys to allow dropping races table
-- Must be OUTSIDE transaction (SQLite requirement)
PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Step 1: Create new races table with UNIQUE constraint on name
CREATE TABLE races_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    discipline TEXT NOT NULL CHECK (discipline IN ('Kajak', 'Kenu', 'SUP', 'Kajakpóló', 'Parakenu', 'Sárkányhajó', 'Szlalom', 'Tengeri kajak')),
    boat_class TEXT NOT NULL,
    boat_class_id INTEGER,
    gender TEXT NOT NULL CHECK (gender IN ('Férfi', 'Női', 'Vegyes')),
    distance TEXT NOT NULL,
    occurrence INTEGER NOT NULL DEFAULT 0,
    hidden BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boat_class_id) REFERENCES boat_classes(id) ON DELETE SET NULL
);

-- Step 2: Copy data from old table to new table
-- Use INSERT OR IGNORE to handle any duplicate race names
INSERT OR IGNORE INTO races_new (id, name, discipline, boat_class, boat_class_id, gender, distance, occurrence, hidden, created_at, updated_at)
SELECT id, name, discipline, boat_class, boat_class_id, gender, distance, occurrence, hidden, created_at, updated_at
FROM races;

-- Step 3: Drop old table
DROP TABLE races;

-- Step 4: Rename new table to original name
ALTER TABLE races_new RENAME TO races;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_races_discipline ON races(discipline);
CREATE INDEX IF NOT EXISTS idx_races_boat_class ON races(boat_class);
CREATE INDEX IF NOT EXISTS idx_races_boat_class_id ON races(boat_class_id);
CREATE INDEX IF NOT EXISTS idx_races_gender ON races(gender);
CREATE INDEX IF NOT EXISTS idx_races_distance ON races(distance);
CREATE INDEX IF NOT EXISTS idx_races_occurrence ON races(occurrence);
CREATE INDEX IF NOT EXISTS idx_races_hidden ON races(hidden);

COMMIT;

-- Re-enable foreign keys (must be OUTSIDE transaction)
PRAGMA foreign_keys = ON;

-- Migration complete: races.name is now UNIQUE
