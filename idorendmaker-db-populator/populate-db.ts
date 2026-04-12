#!/usr/bin/env tsx

/**
 * Catalog Database Populator
 *
 * Reads race data from Excel + boat class metadata and produces a catalog.db
 * file with the new string-code-based schema (7 tables).
 *
 * Usage:
 *   npm run populate              # outputs to ./catalog.db
 *   npm run populate:seed         # outputs to backend seed location
 */

import Database from "better-sqlite3";
import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Schema DDL
// ---------------------------------------------------------------------------

const CATALOG_DDL = `
CREATE TABLE catalog_meta (
    meta_key TEXT PRIMARY KEY,
    meta_value TEXT
);

CREATE TABLE boat_types (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER
);

CREATE TABLE boat_classes (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    boat_type_code TEXT,
    seat_count INTEGER,
    seat_count_text TEXT
);

CREATE TABLE age_groups (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER
);

CREATE TABLE levels (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level_type TEXT,
    sort_order INTEGER,
    is_default INTEGER
);

CREATE TABLE races (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL,
    boat_class_code TEXT NOT NULL,
    gender TEXT NOT NULL,
    distance TEXT NOT NULL,
    hidden INTEGER NOT NULL,
    sort_order INTEGER
);

CREATE TABLE race_age_groups (
    race_code TEXT NOT NULL,
    age_group_code TEXT NOT NULL,
    PRIMARY KEY (race_code, age_group_code)
);
`;

// ---------------------------------------------------------------------------
// Slugification
// ---------------------------------------------------------------------------

const HU_MAP: Record<string, string> = {
  "á": "a", "é": "e", "í": "i", "ó": "o", "ö": "o", "ő": "o",
  "ú": "u", "ü": "u", "ű": "u",
  "Á": "a", "É": "e", "Í": "i", "Ó": "o", "Ö": "o", "Ő": "o",
  "Ú": "u", "Ü": "u", "Ű": "u",
};

function slugify(input: string): string {
  let s = input.toLowerCase();
  // Transliterate Hungarian characters
  s = s.replace(/[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, (ch) => HU_MAP[ch] ?? ch);
  // Remove parentheses and dots
  s = s.replace(/[().]/g, "");
  // Replace spaces / non-alphanumeric with hyphens
  s = s.replace(/[^a-z0-9-]/g, "-");
  // Collapse consecutive hyphens
  s = s.replace(/-+/g, "-");
  // Trim leading/trailing hyphens
  s = s.replace(/^-|-$/g, "");
  return s;
}

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

interface RawRaceData {
  "Versenyszám neve": string;
  "Versenyszám szakág": string;
  Hajóosztály: string;
  "Versenyszám nem": string;
  "Versenyszám évfolyamok": string;
  "Versenyszám táv": string;
  Előfordulás: string;
}

interface NormalizedRaceData {
  name: string;
  discipline: string;
  boatClass: string;
  gender: string;
  distance: string;
  occurrence: number;
  ageGroups: string[];
}

interface BoatClassData {
  name: string;
  boatType: string;
  seatCount: number | null;
  seatCountText: string;
}

// ---------------------------------------------------------------------------
// Levels data (hardcoded)
// ---------------------------------------------------------------------------

const LEVELS_DATA: Array<{
  name: string;
  levelType: string;
  sortOrder: number;
  isDefault?: boolean;
}> = [
  // Elofutamok I-XVI
  { name: "I. Előfutam", levelType: "előfutam", sortOrder: 1 },
  { name: "II. Előfutam", levelType: "előfutam", sortOrder: 2 },
  { name: "III. Előfutam", levelType: "előfutam", sortOrder: 3 },
  { name: "IV. Előfutam", levelType: "előfutam", sortOrder: 4 },
  { name: "V. Előfutam", levelType: "előfutam", sortOrder: 5 },
  { name: "VI. Előfutam", levelType: "előfutam", sortOrder: 6 },
  { name: "VII. Előfutam", levelType: "előfutam", sortOrder: 7 },
  { name: "VIII. Előfutam", levelType: "előfutam", sortOrder: 8 },
  { name: "IX. Előfutam", levelType: "előfutam", sortOrder: 9 },
  { name: "X. Előfutam", levelType: "előfutam", sortOrder: 10 },
  { name: "XI. Előfutam", levelType: "előfutam", sortOrder: 11 },
  { name: "XII. Előfutam", levelType: "előfutam", sortOrder: 12 },
  { name: "XIII. Előfutam", levelType: "előfutam", sortOrder: 13 },
  { name: "XIV. Előfutam", levelType: "előfutam", sortOrder: 14 },
  { name: "XV. Előfutam", levelType: "előfutam", sortOrder: 15 },
  { name: "XVI. Előfutam", levelType: "előfutam", sortOrder: 16 },

  // Kozepfutamok I-X
  { name: "I. Középfutam", levelType: "középfutam", sortOrder: 101 },
  { name: "II. Középfutam", levelType: "középfutam", sortOrder: 102 },
  { name: "III. Középfutam", levelType: "középfutam", sortOrder: 103 },
  { name: "IV. Középfutam", levelType: "középfutam", sortOrder: 104 },
  { name: "V. Középfutam", levelType: "középfutam", sortOrder: 105 },
  { name: "VI. Középfutam", levelType: "középfutam", sortOrder: 106 },
  { name: "VII. Középfutam", levelType: "középfutam", sortOrder: 107 },
  { name: "VIII. Középfutam", levelType: "középfutam", sortOrder: 108 },
  { name: "IX. Középfutam", levelType: "középfutam", sortOrder: 109 },
  { name: "X. Középfutam", levelType: "középfutam", sortOrder: 110 },

  // Letter Dontok A-J
  { name: "A Döntő", levelType: "döntő", sortOrder: 201 },
  { name: "B Döntő", levelType: "döntő", sortOrder: 202 },
  { name: "C Döntő", levelType: "döntő", sortOrder: 203 },
  { name: "D Döntő", levelType: "döntő", sortOrder: 204 },
  { name: "E Döntő", levelType: "döntő", sortOrder: 205 },
  { name: "F Döntő", levelType: "döntő", sortOrder: 206 },
  { name: "G Döntő", levelType: "döntő", sortOrder: 207 },
  { name: "H Döntő", levelType: "döntő", sortOrder: 208 },
  { name: "I Döntő", levelType: "döntő", sortOrder: 209 },
  { name: "J Döntő", levelType: "döntő", sortOrder: 210 },

  // Roman numeral Dontok I-VIII
  { name: "Döntő I.", levelType: "döntő", sortOrder: 211, isDefault: true },
  { name: "Döntő II.", levelType: "döntő", sortOrder: 212 },
  { name: "Döntő III.", levelType: "döntő", sortOrder: 213 },
  { name: "Döntő IV.", levelType: "döntő", sortOrder: 214 },
  { name: "Döntő V.", levelType: "döntő", sortOrder: 215 },
  { name: "Döntő VI.", levelType: "döntő", sortOrder: 216 },
  { name: "Döntő VII.", levelType: "döntő", sortOrder: 217 },
  { name: "Döntő VIII.", levelType: "döntő", sortOrder: 218 },
];

// ---------------------------------------------------------------------------
// Populator
// ---------------------------------------------------------------------------

class CatalogPopulator {
  private db: Database.Database;
  private excelPath: string;
  private boatClassPath: string;
  private dbPath: string;

  constructor(outputPath?: string) {
    this.dbPath = outputPath || path.join(process.cwd(), "catalog.db");
    this.excelPath = path.join(process.cwd(), "../documents", "versenyszamok.xlsx");
    this.boatClassPath = path.join(
      process.cwd(),
      "../documents",
      "Hajoosztaly_Hajoosztaly-tipus_Hajoosztaly-ulesszam.txt"
    );

    // Delete existing db file so we always start fresh
    if (fs.existsSync(this.dbPath)) {
      fs.unlinkSync(this.dbPath);
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(this.dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = DELETE");
  }

  async run() {
    try {
      console.log("Starting catalog database population...");
      console.log(`  Database output: ${this.dbPath}`);
      console.log(`  Excel source:    ${this.excelPath}`);

      // Validate source files
      if (!fs.existsSync(this.excelPath)) {
        throw new Error(`Excel file not found: ${this.excelPath}`);
      }
      if (!fs.existsSync(this.boatClassPath)) {
        throw new Error(`Boat class file not found: ${this.boatClassPath}`);
      }

      // 1. Create schema
      this.db.exec(CATALOG_DDL);
      console.log("  Schema created (7 tables)");

      // 2. Read source data
      const rawRaces = await this.readExcelFile();
      const normalizedRaces = this.normalizeRaces(rawRaces);
      const boatClassData = this.readBoatClassFile();

      console.log(`  Excel: ${normalizedRaces.length} races parsed`);
      console.log(`  Boat classes: ${boatClassData.length} entries parsed`);

      // 3. Populate all tables in a single transaction
      this.populateAll(normalizedRaces, boatClassData);

      // 4. Verify
      this.verify();

      console.log("Catalog database created successfully.");
    } catch (error) {
      console.error("ERROR:", error);
      process.exit(1);
    } finally {
      this.db.close();
    }
  }

  // -------------------------------------------------------------------------
  // Excel reading
  // -------------------------------------------------------------------------

  private async readExcelFile(): Promise<RawRaceData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.excelPath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("No worksheet found in Excel file");

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, col) => {
      headers[col - 1] = cell.value?.toString() || "";
    });

    const data: RawRaceData[] = [];
    worksheet.eachRow((row, rowNum) => {
      if (rowNum <= 1) return;
      const rowData: any = {};
      row.eachCell((cell, col) => {
        const header = headers[col - 1];
        if (header) rowData[header] = cell.value?.toString() || "";
      });
      data.push(rowData as RawRaceData);
    });

    if (data.length === 0) throw new Error("No data in Excel file");
    return data;
  }

  // -------------------------------------------------------------------------
  // Normalize races
  // -------------------------------------------------------------------------

  private normalizeRaces(rawData: RawRaceData[]): NormalizedRaceData[] {
    const allowedDisciplines = [
      "Kajak", "Kenu", "SUP", "Kajakpóló",
      "Parakenu", "Sárkányhajó", "Szlalom", "Tengeri kajak",
    ];

    // First pass: parse all rows
    const parsed: NormalizedRaceData[] = [];

    for (const row of rawData) {
      const discipline = row["Versenyszám szakág"]?.trim();
      if (!allowedDisciplines.includes(discipline)) {
        console.warn(`  WARN: unknown discipline "${discipline}" for "${row["Versenyszám neve"]}"`);
        continue;
      }

      const genderRaw = (row["Versenyszám nem"] || "").trim().toLowerCase();
      let gender: string;
      if (genderRaw.includes("férfi")) gender = "Férfi";
      else if (genderRaw.includes("női")) gender = "Női";
      else gender = "Vegyes";

      const ageGroups = (row["Versenyszám évfolyamok"] || "")
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .filter((s, i, arr) => arr.indexOf(s) === i);

      if (ageGroups.length === 0) {
        console.warn(`  WARN: no age groups for "${row["Versenyszám neve"]}"`);
        continue;
      }

      const name = (row["Versenyszám neve"] || "").trim();
      const boatClass = (row["Hajóosztály"] || "").trim();
      const distance = (row["Versenyszám táv"] || "").trim();
      const occurrence = parseInt(String(row["Előfordulás"])) || 0;

      if (!name || !boatClass || !distance) {
        console.warn(`  WARN: missing required fields for "${row["Versenyszám neve"]}"`);
        continue;
      }

      parsed.push({ name, discipline, boatClass, gender, distance, occurrence, ageGroups });
    }

    // Second pass: deduplicate by slugified name (merge occurrences and age groups)
    const byCode = new Map<string, NormalizedRaceData>();
    let dupeCount = 0;

    for (const race of parsed) {
      const code = slugify(race.name);
      const existing = byCode.get(code);
      if (existing) {
        // Merge: sum occurrences, union age groups
        existing.occurrence += race.occurrence;
        for (const ag of race.ageGroups) {
          if (!existing.ageGroups.includes(ag)) {
            existing.ageGroups.push(ag);
          }
        }
        dupeCount++;
      } else {
        byCode.set(code, { ...race, ageGroups: [...race.ageGroups] });
      }
    }

    if (dupeCount > 0) {
      console.log(`  Deduplicated: ${dupeCount} duplicate race entries merged`);
    }

    return [...byCode.values()];
  }

  // -------------------------------------------------------------------------
  // Read boat class metadata file
  // -------------------------------------------------------------------------

  private readBoatClassFile(): BoatClassData[] {
    const content = fs.readFileSync(this.boatClassPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const result: BoatClassData[] = [];

    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 3) continue;

      const name = parts[0].trim();
      const boatType = parts[1].trim();
      const seatCountText = parts[2].trim();
      const seatCount = seatCountText === "csapat" ? null : parseInt(seatCountText) || null;

      result.push({ name, boatType, seatCount, seatCountText });
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Populate all tables
  // -------------------------------------------------------------------------

  private populateAll(races: NormalizedRaceData[], boatClasses: BoatClassData[]) {
    const txn = this.db.transaction(() => {
      // --- catalog_meta ---
      const insertMeta = this.db.prepare(
        "INSERT INTO catalog_meta (meta_key, meta_value) VALUES (?, ?)"
      );
      insertMeta.run("schema_version", "1");
      insertMeta.run("catalog_version", "2026.0");
      insertMeta.run("generated_at", new Date().toISOString());
      insertMeta.run("source", "seed");

      // --- boat_types (extract unique from boat class data) ---
      const boatTypeNames = [...new Set(boatClasses.map((bc) => bc.boatType))];
      const insertBoatType = this.db.prepare(
        "INSERT INTO boat_types (code, name, sort_order) VALUES (?, ?, ?)"
      );
      boatTypeNames.forEach((name, idx) => {
        insertBoatType.run(slugify(name), name, idx + 1);
      });

      // --- boat_classes ---
      const insertBoatClass = this.db.prepare(
        "INSERT INTO boat_classes (code, name, boat_type_code, seat_count, seat_count_text) VALUES (?, ?, ?, ?, ?)"
      );
      for (const bc of boatClasses) {
        insertBoatClass.run(
          slugify(bc.name),
          bc.name,
          slugify(bc.boatType),
          bc.seatCount,
          bc.seatCountText
        );
      }

      // --- age_groups (extract unique from races) ---
      const ageGroupNames = new Set<string>();
      for (const race of races) {
        for (const ag of race.ageGroups) ageGroupNames.add(ag);
      }
      const sortedAgeGroups = [...ageGroupNames].sort();
      const insertAgeGroup = this.db.prepare(
        "INSERT INTO age_groups (code, name, sort_order) VALUES (?, ?, ?)"
      );
      sortedAgeGroups.forEach((name, idx) => {
        insertAgeGroup.run(slugify(name), name, idx + 1);
      });

      // --- levels ---
      const insertLevel = this.db.prepare(
        "INSERT INTO levels (code, name, level_type, sort_order, is_default) VALUES (?, ?, ?, ?, ?)"
      );
      for (const lv of LEVELS_DATA) {
        insertLevel.run(
          slugify(lv.name),
          lv.name,
          lv.levelType,
          lv.sortOrder,
          lv.isDefault ? 1 : 0
        );
      }

      // --- races (sort by occurrence DESC to assign sort_order) ---
      const sortedRaces = [...races].sort((a, b) => b.occurrence - a.occurrence);
      const insertRace = this.db.prepare(
        "INSERT INTO races (code, name, discipline, boat_class_code, gender, distance, hidden, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );

      // Build a set of valid boat class codes for validation
      const validBoatClassCodes = new Set(boatClasses.map((bc) => slugify(bc.name)));
      const unresolvedBoatClasses: Array<{ raceName: string; boatClass: string; boatClassCode: string }> = [];

      const insertRaceAgeGroup = this.db.prepare(
        "INSERT INTO race_age_groups (race_code, age_group_code) VALUES (?, ?)"
      );

      sortedRaces.forEach((race, idx) => {
        const raceCode = slugify(race.name);
        const boatClassCode = slugify(race.boatClass);

        if (!validBoatClassCodes.has(boatClassCode)) {
          unresolvedBoatClasses.push({ raceName: race.name, boatClass: race.boatClass, boatClassCode });
        }

        insertRace.run(
          raceCode,
          race.name,
          race.discipline,
          boatClassCode,
          race.gender,
          race.distance,
          0, // hidden
          idx + 1 // sort_order: 1 = highest occurrence
        );

        // Link age groups
        for (const ag of race.ageGroups) {
          insertRaceAgeGroup.run(raceCode, slugify(ag));
        }
      });

      return unresolvedBoatClasses;
    });

    const unresolved = txn();

    if (unresolved.length > 0) {
      console.error(`\n  ERROR: ${unresolved.length} race(s) reference boat classes not found in boat_classes table:`);
      for (const u of unresolved) {
        console.error(`    - Race "${u.raceName}" -> boat class "${u.boatClass}" (code: ${u.boatClassCode})`);
      }
      throw new Error(`Unresolved boat class references: ${unresolved.length} race(s) affected. Fix the boat class metadata file.`);
    }
  }

  // -------------------------------------------------------------------------
  // Verify
  // -------------------------------------------------------------------------

  private verify() {
    const count = (table: string) =>
      (this.db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

    console.log("  Verification:");
    console.log(`    catalog_meta:    ${count("catalog_meta")} rows`);
    console.log(`    boat_types:      ${count("boat_types")} rows`);
    console.log(`    boat_classes:    ${count("boat_classes")} rows`);
    console.log(`    age_groups:      ${count("age_groups")} rows`);
    console.log(`    levels:          ${count("levels")} rows`);
    console.log(`    races:           ${count("races")} rows`);
    console.log(`    race_age_groups: ${count("race_age_groups")} rows`);

    // Show default level
    const defLevel = this.db
      .prepare("SELECT code, name FROM levels WHERE is_default = 1")
      .get() as { code: string; name: string } | undefined;
    if (defLevel) {
      console.log(`    Default level: ${defLevel.name} (${defLevel.code})`);
    }

    // Show top 3 races by sort_order
    const topRaces = this.db
      .prepare("SELECT code, name, sort_order FROM races ORDER BY sort_order LIMIT 3")
      .all() as Array<{ code: string; name: string; sort_order: number }>;
    console.log("    Top 3 races (most common):");
    for (const r of topRaces) {
      console.log(`      #${r.sort_order}: ${r.name} (${r.code})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  const outputArg = args.find((a) => a.startsWith("--output="));
  const outputPath = outputArg ? outputArg.split("=").slice(1).join("=") : undefined;

  if (outputPath) {
    console.log(`Output: ${outputPath}`);
  } else {
    console.log(`Output: ${path.join(process.cwd(), "catalog.db")}`);
  }

  const populator = new CatalogPopulator(outputPath);
  populator.run();
}

export default CatalogPopulator;
