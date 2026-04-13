#!/usr/bin/env python3
"""Generate seed-catalog.db from source data files."""
import openpyxl
import sqlite3
import re
import os
from datetime import datetime

BASE = "C:/Users/Szabolcs/Documents/PROJECTS/idorendmaker-app"
XLSX = f"{BASE}/documents/versenyszamok.xlsx"
BOAT_FILE = f"{BASE}/documents/Hajoosztaly_Hajoosztaly-tipus_Hajoosztaly-ulesszam.txt"
LEVEL_FILE = f"{BASE}/documents/Futamszint.txt"
SQL_OUT = f"{BASE}/idorendmaker-backend/src/main/resources/db/catalog-schema.sql"
DB_OUT = f"{BASE}/idorendmaker-backend/src/main/resources/db/seed-catalog.db"

# --- Transliteration ---
TRANS = str.maketrans({
    '\u00e1': 'a', '\u00e9': 'e', '\u00ed': 'i', '\u00f3': 'o',
    '\u00f6': 'o', '\u0151': 'o', '\u00fa': 'u', '\u00fc': 'u', '\u0171': 'u',
    '\u00c1': 'a', '\u00c9': 'e', '\u00cd': 'i', '\u00d3': 'o',
    '\u00d6': 'o', '\u0150': 'o', '\u00da': 'u', '\u00dc': 'u', '\u0170': 'u',
})


def slugify(s):
    s = s.translate(TRANS).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s


def sql_str(s):
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


# ============================================================
# 1. BOAT TYPES & BOAT CLASSES from Hajoosztaly file
# ============================================================
boat_classes_raw = []
with open(BOAT_FILE, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) >= 3:
            name, boat_type_name, seat_count_text = parts[0], parts[1], parts[2]
            boat_classes_raw.append((name, boat_type_name, seat_count_text))

# Extract unique boat types
boat_type_names = sorted(set(bc[1] for bc in boat_classes_raw))
boat_types = []
for i, name in enumerate(boat_type_names):
    code = slugify(name)
    boat_types.append({'code': code, 'name': name, 'sort_order': i})

bt_name_to_code = {bt['name']: bt['code'] for bt in boat_types}

# Build boat classes
boat_classes = []
bc_name_to_code = {}
for bc_name, bt_name, seat_text in boat_classes_raw:
    code = slugify(bc_name)
    bt_code = bt_name_to_code.get(bt_name)
    try:
        seat_count = int(seat_text)
    except (ValueError, TypeError):
        seat_count = None
    boat_classes.append({
        'code': code,
        'name': bc_name,
        'boat_type_code': bt_code,
        'seat_count': seat_count,
        'seat_count_text': seat_text
    })
    bc_name_to_code[bc_name] = code

# ============================================================
# 2. LEVELS from Futamszint.txt
# ============================================================
with open(LEVEL_FILE, encoding='utf-8') as f:
    lines = [l.strip() for l in f if l.strip()]

# Skip header lines
data_lines = [l for l in lines if l not in ('Futamszint', '----------')]

levels = []
donto_order = 0
elofutam_order = 0
kozepfutam_order = 0

for name in data_lines:
    nl = name.lower()
    if 'el\u0151futam' in nl:
        level_type = 'elofutam'
        elofutam_order += 1
        sort_order = 200 + elofutam_order
    elif 'k\u00f6z\u00e9pfutam' in nl:
        level_type = 'kozepfutam'
        kozepfutam_order += 1
        sort_order = 100 + kozepfutam_order
    elif 'd\u00f6nt\u0151' in nl:
        level_type = 'donto'
        donto_order += 1
        sort_order = donto_order
    else:
        level_type = 'egyeb'
        sort_order = 300

    code = slugify(name)
    is_default = 1 if name == 'D\u00f6nt\u0151 I.' else 0
    levels.append({
        'code': code,
        'name': name,
        'level_type': level_type,
        'sort_order': sort_order,
        'is_default': is_default
    })

# ============================================================
# 3. RACES & AGE GROUPS from xlsx
# ============================================================
wb = openpyxl.load_workbook(XLSX, read_only=True)
ws = wb['Sheet1']
all_rows = list(ws.iter_rows(min_row=2, values_only=True))

# Collect unique age groups
age_group_names = set()
for r in all_rows:
    if r[4]:
        for ag in r[4].split(';'):
            ag = ag.strip()
            if ag:
                age_group_names.add(ag)

# Build age groups with sort order
age_group_sort = {
    'El\u0151k\u00e9sz\u00edt\u0151': 10,
    'Gyermek': 20,
    'K\u00f6ly\u00f6k': 30,
    'Serd\u00fcl\u0151': 40,
    'Ifj\u00fas\u00e1gi': 50,
    'U23': 60,
    'Feln\u0151tt': 70,
    'Masters': 80,
    'Szabadid\u0151s \u00e9s Egyetemi': 90,
}

age_groups = []
ag_name_to_code = {}
for name in sorted(age_group_names):
    code = slugify(name)
    # Determine sort order from prefix
    prefix = name.split(' - ')[0] if ' - ' in name else name
    base_sort = age_group_sort.get(prefix, 100)
    # Sub-sort by the age number if present
    m = re.search(r'U(\d+)', name)
    sub = int(m.group(1)) if m else 0
    # For masters with age ranges
    m2 = re.search(r'(\d+)-', name)
    if prefix == 'Masters' and m2:
        sub = int(m2.group(1))
    elif prefix == 'Masters' and '40+' in name:
        sub = 40
    elif prefix == 'Masters' and '50+' in name:
        sub = 50
    # Felnott special case
    if 'feln' in name.lower() and sub == 0:
        sub = 24
    sort_order = base_sort * 100 + sub
    age_groups.append({'code': code, 'name': name, 'sort_order': sort_order})
    ag_name_to_code[name] = code

# Build races and race_age_groups
races = []
race_age_groups = []
race_codes_seen = set()

gender_map = {'F\u00e9rfi': 'ferfi', 'N\u0151': 'noi', 'Vegyes': 'vegyes'}

for idx, r in enumerate(all_rows):
    race_name = r[0]
    discipline = r[1]
    bc_name = r[2]
    gender = r[3]
    ag_text = r[4]
    distance = r[5]

    if not race_name:
        continue

    bc_code = bc_name_to_code.get(bc_name, slugify(bc_name))
    gender_slug = gender_map.get(gender, slugify(gender))

    # Parse age groups for this race
    race_ags = []
    if ag_text:
        for ag in ag_text.split(';'):
            ag = ag.strip()
            if ag and ag in ag_name_to_code:
                race_ags.append(ag_name_to_code[ag])

    # Build age group part of code
    if len(race_ags) == 1:
        ag_slug = race_ags[0]
    elif len(race_ags) > 1:
        ag_slug = '-'.join(sorted(race_ags))
    else:
        ag_slug = 'open'

    dist_slug = slugify(distance)

    # Generate race code
    race_code = f"{bc_code}-{gender_slug}-{ag_slug}-{dist_slug}"

    # Handle duplicates
    if race_code in race_codes_seen:
        suffix = 2
        while f"{race_code}-{suffix}" in race_codes_seen:
            suffix += 1
        race_code = f"{race_code}-{suffix}"

    race_codes_seen.add(race_code)

    races.append({
        'code': race_code,
        'name': race_name,
        'discipline': discipline,
        'boat_class_code': bc_code,
        'gender': gender,
        'distance': distance,
        'hidden': 0,
        'sort_order': idx
    })

    for ag_code in race_ags:
        race_age_groups.append({
            'race_code': race_code,
            'age_group_code': ag_code
        })

wb.close()

# ============================================================
# 4. Generate SQL
# ============================================================
sql_lines = []
sql_lines.append("-- Catalog seed data for idorendmaker")
sql_lines.append(f"-- Generated: {datetime.now().isoformat()}")
sql_lines.append("")

sql_lines.append("""CREATE TABLE IF NOT EXISTS catalog_meta (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT
);

CREATE TABLE IF NOT EXISTS boat_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS boat_classes (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    boat_type_code TEXT,
    seat_count INTEGER,
    seat_count_text TEXT
);

CREATE TABLE IF NOT EXISTS age_groups (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS levels (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level_type TEXT,
    sort_order INTEGER,
    is_default INTEGER
);

CREATE TABLE IF NOT EXISTS races (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL,
    boat_class_code TEXT NOT NULL,
    gender TEXT NOT NULL,
    distance TEXT NOT NULL,
    hidden INTEGER NOT NULL,
    sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS race_age_groups (
    race_code TEXT NOT NULL,
    age_group_code TEXT NOT NULL,
    PRIMARY KEY (race_code, age_group_code)
);
""")

# catalog_meta
now_str = datetime.now().isoformat()
sql_lines.append("-- catalog_meta")
sql_lines.append("INSERT INTO catalog_meta (meta_key, meta_value) VALUES ('schema_version', '1');")
sql_lines.append("INSERT INTO catalog_meta (meta_key, meta_value) VALUES ('catalog_version', '2026.0');")
sql_lines.append(f"INSERT INTO catalog_meta (meta_key, meta_value) VALUES ('generated_at', '{now_str}');")
sql_lines.append("INSERT INTO catalog_meta (meta_key, meta_value) VALUES ('source', 'seed');")
sql_lines.append("")

# boat_types
sql_lines.append("-- boat_types")
for bt in boat_types:
    sql_lines.append(
        f"INSERT INTO boat_types (code, name, sort_order) VALUES "
        f"({sql_str(bt['code'])}, {sql_str(bt['name'])}, {bt['sort_order']});"
    )
sql_lines.append("")

# boat_classes
sql_lines.append("-- boat_classes")
for bc in boat_classes:
    sc = bc['seat_count'] if bc['seat_count'] is not None else 'NULL'
    sql_lines.append(
        f"INSERT INTO boat_classes (code, name, boat_type_code, seat_count, seat_count_text) VALUES "
        f"({sql_str(bc['code'])}, {sql_str(bc['name'])}, {sql_str(bc['boat_type_code'])}, {sc}, {sql_str(bc['seat_count_text'])});"
    )
sql_lines.append("")

# age_groups
sql_lines.append("-- age_groups")
for ag in age_groups:
    sql_lines.append(
        f"INSERT INTO age_groups (code, name, sort_order) VALUES "
        f"({sql_str(ag['code'])}, {sql_str(ag['name'])}, {ag['sort_order']});"
    )
sql_lines.append("")

# levels
sql_lines.append("-- levels")
for lv in levels:
    sql_lines.append(
        f"INSERT INTO levels (code, name, level_type, sort_order, is_default) VALUES "
        f"({sql_str(lv['code'])}, {sql_str(lv['name'])}, {sql_str(lv['level_type'])}, {lv['sort_order']}, {lv['is_default']});"
    )
sql_lines.append("")

# races
sql_lines.append("-- races")
for rc in races:
    sql_lines.append(
        f"INSERT INTO races (code, name, discipline, boat_class_code, gender, distance, hidden, sort_order) VALUES "
        f"({sql_str(rc['code'])}, {sql_str(rc['name'])}, {sql_str(rc['discipline'])}, "
        f"{sql_str(rc['boat_class_code'])}, {sql_str(rc['gender'])}, {sql_str(rc['distance'])}, "
        f"{rc['hidden']}, {rc['sort_order']});"
    )
sql_lines.append("")

# race_age_groups
sql_lines.append("-- race_age_groups")
for rag in race_age_groups:
    sql_lines.append(
        f"INSERT INTO race_age_groups (race_code, age_group_code) VALUES "
        f"({sql_str(rag['race_code'])}, {sql_str(rag['age_group_code'])});"
    )
sql_lines.append("")

# Write SQL file
sql_content = '\n'.join(sql_lines)
with open(SQL_OUT, 'w', encoding='utf-8') as f:
    f.write(sql_content)

print(f"SQL written to {SQL_OUT}")
print(f"  boat_types: {len(boat_types)}")
print(f"  boat_classes: {len(boat_classes)}")
print(f"  age_groups: {len(age_groups)}")
print(f"  levels: {len(levels)}")
print(f"  races: {len(races)}")
print(f"  race_age_groups: {len(race_age_groups)}")

# ============================================================
# 5. Build SQLite database
# ============================================================
if os.path.exists(DB_OUT):
    os.remove(DB_OUT)

conn = sqlite3.connect(DB_OUT)
conn.executescript(sql_content)
conn.commit()

# Verify
cur = conn.cursor()
tables = ['catalog_meta', 'boat_types', 'boat_classes', 'age_groups',
          'levels', 'races', 'race_age_groups']
print("\nVerification:")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    count = cur.fetchone()[0]
    print(f"  {t}: {count} rows")

# Sample race codes
cur.execute("SELECT code, name FROM races LIMIT 5")
print("\nSample race codes:")
for row in cur.fetchall():
    print(f"  {row[0]} -> {row[1]}")

# Sample level codes
cur.execute("SELECT code, name, level_type, is_default FROM levels WHERE is_default = 1")
print("\nDefault level:")
for row in cur.fetchall():
    print(f"  {row[0]} -> {row[1]} (type={row[2]}, default={row[3]})")

# Check boat type codes
cur.execute("SELECT code, name FROM boat_types ORDER BY sort_order")
print("\nBoat types:")
for row in cur.fetchall():
    print(f"  {row[0]} -> {row[1]}")

conn.close()
print(f"\nDatabase written to {DB_OUT}")
print("Done!")
