-- Complete Database Schema - Matches Prisma Schema Exactly
-- Generated to eliminate need for prisma:push migrations

-- Main races table
CREATE TABLE IF NOT EXISTS races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL CHECK (discipline IN ('Kajak', 'Kenu', 'SUP', 'Kajakpóló', 'Parakenu', 'Sárkányhajó', 'Szlalom', 'Tengeri kajak')),
    boat_class TEXT NOT NULL, -- Legacy string field - kept for backward compatibility
    boat_class_id INTEGER, -- Reference to boat_classes table for enhanced rule system
    gender TEXT NOT NULL CHECK (gender IN ('Férfi', 'Női', 'Vegyes')),
    distance TEXT NOT NULL,
    occurrence INTEGER NOT NULL DEFAULT 0, -- Track historical frequency for relevance sorting
    hidden BOOLEAN NOT NULL DEFAULT 0, -- User can hide races they don't organize
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (boat_class_id) REFERENCES boat_classes(id) ON DELETE SET NULL
);

-- Age groups lookup table
CREATE TABLE IF NOT EXISTS age_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL, -- e.g., "Serdülő - U15", "Serdülő - U16"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Boat classes metadata table - for enhanced rule system
CREATE TABLE IF NOT EXISTS boat_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL, -- e.g., "Kajak egyes", "Kajak páros"
    boat_type TEXT NOT NULL, -- e.g., "Kajak", "Minikajak", "Kenu"
    seat_count INTEGER, -- e.g., 1, 2, 4, 20, NULL for "csapat"
    seat_count_text TEXT NOT NULL, -- e.g., "1", "2", "4", "20", "csapat"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many junction table for race age groups
CREATE TABLE IF NOT EXISTS race_age_groups (
    race_id INTEGER NOT NULL,
    age_group_id INTEGER NOT NULL,
    PRIMARY KEY (race_id, age_group_id),
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (age_group_id) REFERENCES age_groups(id) ON DELETE CASCADE
);

-- Schedules table - container with optional PDF link
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pdf_extraction_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pdf_extraction_id) REFERENCES pdf_extractions(id) ON DELETE SET NULL
);

-- Schedule sections - the single source of truth for timing
CREATE TABLE IF NOT EXISTS schedule_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL DEFAULT 1,
    section_type TEXT NOT NULL CHECK (section_type IN ('délelőtt', 'délután')),
    start_time TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    UNIQUE(schedule_id, day_number, section_type)
);

-- Levels table - competitive levels for races (futamszint)
CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL, -- e.g., "A Döntő", "I. Előfutam", "Döntő I."
    level_type TEXT NOT NULL, -- "döntő", "előfutam", "középfutam"
    sort_order INTEGER NOT NULL DEFAULT 0, -- For UI display ordering
    is_default BOOLEAN NOT NULL DEFAULT 0, -- Mark "Döntő I." as default
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedule items - races with their interval data
CREATE TABLE IF NOT EXISTS schedule_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    race_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL, -- Reference to competitive level
    order_index INTEGER NOT NULL,
    interval_minutes INTEGER NOT NULL DEFAULT 15, -- Break time AFTER this race
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES schedule_sections(id) ON DELETE CASCADE,
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE
);

-- Rules table - extensible rule architecture
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    min_interval_minutes INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rule conditions - flexible condition system
CREATE TABLE IF NOT EXISTS rule_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    condition_set TEXT NOT NULL CHECK (condition_set IN ('A', 'B')),
    field TEXT NOT NULL, -- discipline, boatClass, gender, distance, ageGroups, level, levelType, boatType, seatCount
    operator TEXT NOT NULL, -- equals, contains, not_equals, in
    value TEXT NOT NULL,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

-- Rule matching requirements - fields that must match between races
CREATE TABLE IF NOT EXISTS rule_matchings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL,
    field TEXT NOT NULL, -- field that must have same value in both races
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

-- Dismissed rule violations - track which warnings user has dismissed
CREATE TABLE IF NOT EXISTS dismissed_rule_violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    violation_hash TEXT NOT NULL, -- Unique identifier: ruleId-race1Id-race1StartTime-race2Id-race2StartTime
    dismissed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    UNIQUE(schedule_id, violation_hash)
);

-- PDF Processing & Competitor-Aware Tables
CREATE TABLE IF NOT EXISTS pdf_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_hash TEXT UNIQUE, -- SHA-256 hash for deduplication
    total_races INTEGER NOT NULL DEFAULT 0,
    total_competitors INTEGER NOT NULL DEFAULT 0,
    total_entries INTEGER NOT NULL DEFAULT 0,
    extraction_status TEXT NOT NULL DEFAULT 'completed', -- "processing", "completed", "error"
    status TEXT NOT NULL DEFAULT 'session', -- "session", "linked", "archived" - lifecycle management
    linked_at DATETIME, -- When data was promoted from session to linked
    expires_at DATETIME, -- When session data expires (null for linked data)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitor_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pdf_extraction_id INTEGER NOT NULL,
    competitor_id TEXT NOT NULL, -- Unique identifier from PDF
    competitor_name TEXT NOT NULL,
    organization TEXT, -- Club/organization
    birth_year INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pdf_extraction_id) REFERENCES pdf_extractions(id) ON DELETE CASCADE,
    UNIQUE(pdf_extraction_id, competitor_id)
);

CREATE TABLE IF NOT EXISTS race_competitor_associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pdf_extraction_id INTEGER NOT NULL,
    race_id INTEGER NOT NULL, -- Database race ID (matched)
    competitor_id TEXT NOT NULL, -- From PDF
    pdf_race_name TEXT NOT NULL, -- Original race name from PDF
    match_confidence REAL NOT NULL DEFAULT 1.0, -- 0.0 to 1.0 confidence score
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pdf_extraction_id) REFERENCES pdf_extractions(id) ON DELETE CASCADE,
    FOREIGN KEY (race_id) REFERENCES races(id) ON DELETE CASCADE,
    FOREIGN KEY (pdf_extraction_id, competitor_id) REFERENCES competitor_entries(pdf_extraction_id, competitor_id) ON DELETE CASCADE,
    UNIQUE(pdf_extraction_id, race_id, competitor_id)
);

-- Indexes for better performance - Match Prisma Schema Exactly

-- Race table indexes
CREATE INDEX IF NOT EXISTS idx_races_discipline ON races(discipline);
CREATE INDEX IF NOT EXISTS idx_races_boat_class ON races(boat_class);
CREATE INDEX IF NOT EXISTS idx_races_boat_class_id ON races(boat_class_id);
CREATE INDEX IF NOT EXISTS idx_races_gender ON races(gender);
CREATE INDEX IF NOT EXISTS idx_races_distance ON races(distance);
CREATE INDEX IF NOT EXISTS idx_races_occurrence ON races(occurrence);
CREATE INDEX IF NOT EXISTS idx_races_hidden ON races(hidden);

-- Age groups indexes
CREATE INDEX IF NOT EXISTS idx_age_groups_name ON age_groups(name);

-- Boat classes indexes
CREATE INDEX IF NOT EXISTS idx_boat_classes_name ON boat_classes(name);
CREATE INDEX IF NOT EXISTS idx_boat_classes_boat_type ON boat_classes(boat_type);
CREATE INDEX IF NOT EXISTS idx_boat_classes_seat_count ON boat_classes(seat_count);
CREATE INDEX IF NOT EXISTS idx_boat_classes_seat_count_text ON boat_classes(seat_count_text);

-- Race age groups indexes
CREATE INDEX IF NOT EXISTS idx_race_age_groups_race_id ON race_age_groups(race_id);
CREATE INDEX IF NOT EXISTS idx_race_age_groups_age_group_id ON race_age_groups(age_group_id);

-- Schedules indexes
CREATE INDEX IF NOT EXISTS idx_schedules_pdf_extraction_id ON schedules(pdf_extraction_id);

-- Schedule sections indexes
CREATE INDEX IF NOT EXISTS idx_schedule_sections_schedule_id ON schedule_sections(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_sections_day_section ON schedule_sections(schedule_id, day_number, section_type);

-- Levels indexes
CREATE INDEX IF NOT EXISTS idx_levels_level_type ON levels(level_type);
CREATE INDEX IF NOT EXISTS idx_levels_sort_order ON levels(sort_order);
CREATE INDEX IF NOT EXISTS idx_levels_is_default ON levels(is_default);

-- Schedule items indexes
CREATE INDEX IF NOT EXISTS idx_schedule_items_schedule_id ON schedule_items(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_section_id ON schedule_items(section_id);
CREATE INDEX IF NOT EXISTS idx_schedule_items_order ON schedule_items(schedule_id, section_id, order_index);
CREATE INDEX IF NOT EXISTS idx_schedule_items_race_level ON schedule_items(race_id, level_id);

-- Rules indexes
CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);

-- Rule conditions indexes
CREATE INDEX IF NOT EXISTS idx_rule_conditions_rule_id ON rule_conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_conditions_condition_set ON rule_conditions(condition_set);
CREATE INDEX IF NOT EXISTS idx_rule_conditions_field ON rule_conditions(field);

-- Rule matchings indexes
CREATE INDEX IF NOT EXISTS idx_rule_matchings_rule_id ON rule_matchings(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_matchings_field ON rule_matchings(field);

-- Dismissed violations indexes
CREATE INDEX IF NOT EXISTS idx_dismissed_violations_schedule_id ON dismissed_rule_violations(schedule_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_violations_hash ON dismissed_rule_violations(violation_hash);

-- PDF extractions indexes
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_extraction_status ON pdf_extractions(extraction_status);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_created_at ON pdf_extractions(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_file_hash ON pdf_extractions(file_hash);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_status ON pdf_extractions(status);
CREATE INDEX IF NOT EXISTS idx_pdf_extractions_expires_at ON pdf_extractions(expires_at);

-- Competitor entries indexes
CREATE INDEX IF NOT EXISTS idx_competitor_entries_pdf_extraction_id ON competitor_entries(pdf_extraction_id);
CREATE INDEX IF NOT EXISTS idx_competitor_entries_competitor_id ON competitor_entries(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_entries_competitor_name ON competitor_entries(competitor_name);

-- Race competitor associations indexes
CREATE INDEX IF NOT EXISTS idx_race_competitor_associations_pdf_extraction_id ON race_competitor_associations(pdf_extraction_id);
CREATE INDEX IF NOT EXISTS idx_race_competitor_associations_race_id ON race_competitor_associations(race_id);
CREATE INDEX IF NOT EXISTS idx_race_competitor_associations_competitor_id ON race_competitor_associations(competitor_id);
CREATE INDEX IF NOT EXISTS idx_race_competitor_associations_match_confidence ON race_competitor_associations(match_confidence);