#!/usr/bin/env tsx

/**
 * Migration Generator - Excel Diff to SQL Migration
 *
 * This script compares two Excel files (old and new versions) and generates
 * SQL migration statements to update existing application instances.
 *
 * Usage: npm run generate-migration -- --old=path/old.xlsx --new=path/new.xlsx [--output=path/output.sql]
 */

import ExcelJS from "exceljs";
import * as path from "path";
import * as fs from "fs";

interface RawRaceData {
  "Versenyszám neve": string;
  "Versenyszám szakág": string;
  Hajóosztály: string;
  "Versenyszám nem": string;
  "Versenyszám évfolyamok": string;
  "Versenyszám táv": string;
  Előfordulás: number;
}

interface NormalizedRaceData {
  name: string;
  discipline:
    | "Kajak"
    | "Kenu"
    | "SUP"
    | "Kajakpóló"
    | "Parakenu"
    | "Sárkányhajó"
    | "Szlalom"
    | "Tengeri kajak";
  boatClass: string;
  gender: "Férfi" | "Női" | "Vegyes";
  distance: string;
  occurrence: number;
  ageGroups: string[];
}

interface MigrationStats {
  inserts: number;
  updates: number;
}

class MigrationGenerator {
  private oldExcelPath: string;
  private newExcelPath: string;
  private outputPath: string;

  constructor(oldExcelPath: string, newExcelPath: string, outputPath?: string) {
    this.oldExcelPath = oldExcelPath;
    this.newExcelPath = newExcelPath;

    // Default output path with timestamp
    if (outputPath) {
      this.outputPath = outputPath;
    } else {
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T]/g, "")
        .split(".")[0];
      const migrationsDir = path.join(process.cwd(), "migrations");
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }
      this.outputPath = path.join(
        migrationsDir,
        `V${timestamp}__update_races.sql`
      );
    }
  }

  async run() {
    try {
      console.log("🚀 Starting migration generation...");
      console.log(`📂 Old Excel: ${this.oldExcelPath}`);
      console.log(`📂 New Excel: ${this.newExcelPath}`);
      console.log(`📝 Output SQL: ${this.outputPath}`);

      // Step 1: Check if Excel files exist
      this.checkExcelFiles();

      // Step 2: Read and normalize both Excel files
      const oldRawData = await this.readExcelFile(this.oldExcelPath);
      const newRawData = await this.readExcelFile(this.newExcelPath);

      console.log(`📊 Old Excel: ${oldRawData.length} races`);
      console.log(`📊 New Excel: ${newRawData.length} races`);

      // Step 3: Normalize data
      const oldNormalized = this.normalizeData(oldRawData);
      const newNormalized = this.normalizeData(newRawData);

      console.log(`✅ Old normalized: ${oldNormalized.length} races`);
      console.log(`✅ New normalized: ${newNormalized.length} races`);

      // Step 4: Generate diff and SQL
      const { sql, stats } = this.generateMigrationSQL(
        oldNormalized,
        newNormalized
      );

      // Step 5: Write SQL file
      fs.writeFileSync(this.outputPath, sql, "utf-8");

      console.log(`\n🎉 Migration generated successfully!`);
      console.log(`📊 Summary: ${stats.inserts} inserts, ${stats.updates} updates`);
      console.log(`📝 Output: ${this.outputPath}`);
    } catch (error) {
      console.error("❌ Error during migration generation:", error);
      process.exit(1);
    }
  }

  private checkExcelFiles() {
    if (!fs.existsSync(this.oldExcelPath)) {
      throw new Error(`Old Excel file not found at: ${this.oldExcelPath}`);
    }
    if (!fs.existsSync(this.newExcelPath)) {
      throw new Error(`New Excel file not found at: ${this.newExcelPath}`);
    }
  }

  private async readExcelFile(excelPath: string): Promise<RawRaceData[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error(`No worksheet found in Excel file: ${excelPath}`);
    }

    const data: RawRaceData[] = [];
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    // Extract headers
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || "";
    });

    // Extract data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value?.toString() || "";
          }
        });
        data.push(rowData as RawRaceData);
      }
    });

    if (data.length === 0) {
      throw new Error(`No data found in Excel file: ${excelPath}`);
    }

    return data;
  }

  private normalizeData(rawData: RawRaceData[]): NormalizedRaceData[] {
    const normalizedData: NormalizedRaceData[] = [];

    for (const row of rawData) {
      try {
        // Parse discipline
        const discipline = row["Versenyszám szakág"]?.trim();
        const allowedDisciplines = [
          "Kajak",
          "Kenu",
          "SUP",
          "Kajakpóló",
          "Parakenu",
          "Sárkányhajó",
          "Szlalom",
          "Tengeri kajak",
        ];
        if (!allowedDisciplines.includes(discipline)) {
          console.warn(
            `⚠️ Unknown discipline: ${discipline} for race: ${row["Versenyszám neve"]}`
          );
          continue;
        }

        // Parse gender
        const genderRaw = row["Versenyszám nem"]?.trim().toLowerCase();
        let gender: "Férfi" | "Női" | "Vegyes";
        if (genderRaw.includes("férfi")) {
          gender = "Férfi";
        } else if (genderRaw.includes("női")) {
          gender = "Női";
        } else {
          gender = "Vegyes";
        }

        // Parse age groups
        const ageGroupsRaw = row["Versenyszám évfolyamok"]?.trim() || "";
        const ageGroups = ageGroupsRaw
          .split(";")
          .map((group) => group.trim())
          .filter((group) => group.length > 0);

        if (ageGroups.length === 0) {
          console.warn(
            `⚠️ No age groups found for race: ${row["Versenyszám neve"]}`
          );
          continue;
        }

        // Parse occurrence
        const occurrence = parseInt(String(row["Előfordulás"])) || 0;

        const normalizedRace: NormalizedRaceData = {
          name: row["Versenyszám neve"]?.trim() || "",
          discipline: discipline as any,
          boatClass: row["Hajóosztály"]?.trim() || "",
          gender,
          distance: row["Versenyszám táv"]?.trim() || "",
          occurrence,
          ageGroups,
        };

        // Validate required fields
        if (
          !normalizedRace.name ||
          !normalizedRace.boatClass ||
          !normalizedRace.distance
        ) {
          console.warn(
            `⚠️ Missing required fields for race: ${row["Versenyszám neve"]}`
          );
          continue;
        }

        normalizedData.push(normalizedRace);
      } catch (error) {
        console.error(
          `❌ Error processing race: ${row["Versenyszám neve"]}`,
          error
        );
      }
    }

    return normalizedData;
  }

  private generateMigrationSQL(
    oldRaces: NormalizedRaceData[],
    newRaces: NormalizedRaceData[]
  ): { sql: string; stats: MigrationStats } {
    console.log("\n🔄 Generating migration SQL...");

    // Create map of old races by name for quick lookup
    const oldRaceMap = new Map<string, NormalizedRaceData>();
    for (const race of oldRaces) {
      oldRaceMap.set(race.name, race);
    }

    const insertRaces: NormalizedRaceData[] = [];
    const updateRaces: { race: NormalizedRaceData; oldOccurrence: number }[] =
      [];

    // Compare new races with old races
    for (const newRace of newRaces) {
      const oldRace = oldRaceMap.get(newRace.name);

      if (!oldRace) {
        // New race - INSERT
        insertRaces.push(newRace);
      } else if (oldRace.occurrence !== newRace.occurrence) {
        // Existing race with changed occurrence - UPDATE
        updateRaces.push({
          race: newRace,
          oldOccurrence: oldRace.occurrence,
        });
      }
      // If race exists and occurrence unchanged, do nothing
    }

    console.log(`📝 Races to insert: ${insertRaces.length}`);
    console.log(`📝 Races to update: ${updateRaces.length}`);

    // Generate SQL
    const sqlLines: string[] = [];

    // Header
    const timestamp = new Date().toISOString();
    sqlLines.push(`-- Migration generated on ${timestamp}`);
    sqlLines.push(`-- Old file: ${this.oldExcelPath}`);
    sqlLines.push(`-- New file: ${this.newExcelPath}`);
    sqlLines.push(
      `-- Summary: ${insertRaces.length} inserts, ${updateRaces.length} updates`
    );
    sqlLines.push("");
    sqlLines.push("BEGIN TRANSACTION;");
    sqlLines.push("");

    // Generate INSERT statements
    if (insertRaces.length > 0) {
      sqlLines.push("-- ========================================");
      sqlLines.push("-- INSERT NEW RACES");
      sqlLines.push("-- ========================================");
      sqlLines.push("");

      // Collect all unique age groups from new races
      const allAgeGroups = new Set<string>();
      for (const race of insertRaces) {
        for (const ageGroup of race.ageGroups) {
          allAgeGroups.add(ageGroup);
        }
      }

      // Insert age groups first
      if (allAgeGroups.size > 0) {
        sqlLines.push("-- Insert age groups (ignore if already exist)");
        for (const ageGroup of Array.from(allAgeGroups).sort()) {
          sqlLines.push(
            `INSERT OR IGNORE INTO age_groups (name) VALUES ('${this.escapeSql(ageGroup)}');`
          );
        }
        sqlLines.push("");
      }

      // Insert races (use OR IGNORE for idempotency - works on fresh installs and updates)
      sqlLines.push("-- Insert new races (OR IGNORE for idempotency)");
      for (const race of insertRaces) {
        sqlLines.push(
          `INSERT OR IGNORE INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)`
        );
        sqlLines.push(
          `VALUES ('${this.escapeSql(race.name)}', '${this.escapeSql(race.discipline)}', '${this.escapeSql(race.boatClass)}', '${this.escapeSql(race.gender)}', '${this.escapeSql(race.distance)}', ${race.occurrence}, 0);`
        );
        sqlLines.push("");
      }

      // Link races to boat classes by name (set boat_class_id foreign key)
      sqlLines.push("-- Link new races to boat classes by name");
      for (const race of insertRaces) {
        sqlLines.push(
          `UPDATE races SET boat_class_id = (SELECT id FROM boat_classes WHERE name = '${this.escapeSql(race.boatClass)}')`
        );
        sqlLines.push(
          `WHERE name = '${this.escapeSql(race.name)}';`
        );
        sqlLines.push("");
      }

      // Link races to age groups (use OR IGNORE for idempotency)
      sqlLines.push("-- Link new races to age groups (OR IGNORE for idempotency)");
      for (const race of insertRaces) {
        for (const ageGroup of race.ageGroups) {
          sqlLines.push(
            `INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)`
          );
          sqlLines.push(
            `SELECT r.id, ag.id FROM races r, age_groups ag`
          );
          sqlLines.push(
            `WHERE r.name = '${this.escapeSql(race.name)}' AND ag.name = '${this.escapeSql(ageGroup)}';`
          );
          sqlLines.push("");
        }
      }
    }

    // Generate UPDATE statements
    if (updateRaces.length > 0) {
      sqlLines.push("-- ========================================");
      sqlLines.push("-- UPDATE EXISTING RACES (OCCURRENCE CHANGED)");
      sqlLines.push("-- ========================================");
      sqlLines.push("");

      for (const { race, oldOccurrence } of updateRaces) {
        sqlLines.push(
          `-- ${race.name}: ${oldOccurrence} → ${race.occurrence}`
        );
        sqlLines.push(
          `UPDATE races SET occurrence = ${race.occurrence} WHERE name = '${this.escapeSql(race.name)}';`
        );
        sqlLines.push("");
      }
    }

    sqlLines.push("COMMIT;");
    sqlLines.push("");
    sqlLines.push("-- Migration complete");

    const stats: MigrationStats = {
      inserts: insertRaces.length,
      updates: updateRaces.length,
    };

    return {
      sql: sqlLines.join("\n"),
      stats,
    };
  }

  private escapeSql(value: string): string {
    // Escape single quotes for SQL
    return value.replace(/'/g, "''");
  }
}

// Parse command line arguments
function parseArgs(): {
  oldExcel?: string;
  newExcel?: string;
  output?: string;
} {
  const args = process.argv.slice(2);
  const result: { oldExcel?: string; newExcel?: string; output?: string } = {};

  for (const arg of args) {
    if (arg.startsWith("--old=")) {
      result.oldExcel = arg.split("=")[1];
    } else if (arg.startsWith("--new=")) {
      result.newExcel = arg.split("=")[1];
    } else if (arg.startsWith("--output=")) {
      result.output = arg.split("=")[1];
    }
  }

  return result;
}

// Run the migration generator if this script is executed directly
if (require.main === module) {
  const args = parseArgs();

  if (!args.oldExcel || !args.newExcel) {
    console.error("❌ Missing required arguments");
    console.log("\nUsage:");
    console.log(
      "  npm run generate-migration -- --old=path/old.xlsx --new=path/new.xlsx [--output=path/output.sql]"
    );
    console.log("\nExample:");
    console.log(
      "  npm run generate-migration -- --old=../documents/versenyszamok_old.xlsx --new=../documents/versenyszamok.xlsx"
    );
    process.exit(1);
  }

  const generator = new MigrationGenerator(
    args.oldExcel,
    args.newExcel,
    args.output
  );
  generator.run();
}

export default MigrationGenerator;