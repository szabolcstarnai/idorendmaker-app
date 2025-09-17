#!/usr/bin/env tsx

/**
 * Service Tunnel App - Database Population Script
 * 
 * This script reads the Excel file containing all possible race data
 * and populates the SQLite database with normalized data structure.
 * 
 * Usage: npm run populate-db
 */

import Database from 'better-sqlite3';
import ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface RawRaceData {
  'Versenyszám neve': string;
  'Versenyszám szakág': string;
  'Hajóosztály': string;
  'Versenyszám nem': string;
  'Versenyszám évfolyamok': string;
  'Versenyszám táv': string;
  'Előfordulás': number;
}

interface NormalizedRaceData {
  name: string;
  discipline: 'Kajak' | 'Kenu' | 'SUP' | 'Kajakpóló' | 'Parakenu' | 'Sárkányhajó' | 'Szlalom' | 'Tengeri kajak';
  boatClass: string;  // Changed to camelCase
  gender: 'Férfi' | 'Női' | 'Vegyes';
  distance: string;
  occurrence: number;
  ageGroups: string[];  // Changed to camelCase
}

class DatabasePopulator {
  private db: Database.Database;
  private excelPath: string;
  private dbPath: string;

  constructor(outputPath?: string) {
    // Database path - configurable with fallback to current behavior
    this.dbPath = outputPath || path.join(process.cwd(), 'idorendmaker.db');
    this.db = new Database(this.dbPath);
    
    // Excel file path - always relative to current working directory
    this.excelPath = path.join(process.cwd(), '../documents', 'versenyszamok.xlsx');
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
  }

  async run() {
    try {
      console.log('🚀 Starting database population...');
      console.log(`📂 Database output path: ${this.dbPath}`);
      console.log(`📊 Excel source path: ${this.excelPath}`);
      
      // Step 1: Check if Excel file exists
      this.checkExcelFile();
      
      // Step 2: Initialize database with new schema
      this.initializeDatabase();
      
      // Step 3: Read and parse Excel data
      const rawData = await this.readExcelFile();
      console.log(`📊 Found ${rawData.length} races in Excel file`);
      
      // Step 4: Normalize data
      const normalizedData = this.normalizeData(rawData);
      console.log(`✅ Normalized ${normalizedData.length} races`);
      
      // Step 5: Populate database
      await this.populateDatabase(normalizedData);
      
      // Step 6: Populate levels table
      this.populateLevels();
      
      // Step 7: Verify results
      this.verifyResults();
      
      console.log('🎉 Database population completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during database population:', error);
      process.exit(1);
    } finally {
      this.db.close();
    }
  }

  private checkExcelFile() {
    if (!fs.existsSync(this.excelPath)) {
      throw new Error(`Excel file not found at: ${this.excelPath}`);
    }
    console.log(`📁 Excel file found: ${this.excelPath}`);
  }

  private initializeDatabase() {
    console.log('🔧 Initializing database schema...');
    
    // Read and execute the current unified schema
    const schemaPath = path.join(process.cwd(), 'shared', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
    console.log('✅ Database schema initialized from shared/database/schema.sql');
  }

  private async readExcelFile(): Promise<RawRaceData[]> {
    console.log('📖 Reading Excel file...');
    
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.excelPath);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }
    
    // Convert worksheet to JSON-like data
    const data: RawRaceData[] = [];
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    
    // Extract headers
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });
    
    // Extract data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            rowData[header] = cell.value?.toString() || '';
          }
        });
        data.push(rowData as RawRaceData);
      }
    });
    
    if (data.length === 0) {
      throw new Error('No data found in Excel file');
    }
    
    console.log(`✅ Successfully read ${data.length} rows from Excel`);
    return data;
  }

  private normalizeData(rawData: RawRaceData[]): NormalizedRaceData[] {
    console.log('🔄 Normalizing race data...');
    
    const normalizedData: NormalizedRaceData[] = [];
    
    for (const row of rawData) {
      try {
        // Parse discipline
        const discipline = row['Versenyszám szakág']?.trim();
        const allowedDisciplines = [
          'Kajak',
          'Kenu',
          'SUP',
          'Kajakpóló',
          'Parakenu',
          'Sárkányhajó',
          'Szlalom',
          'Tengeri kajak'
        ];
        if (!allowedDisciplines.includes(discipline)) {
          console.warn(`⚠️ Unknown discipline: ${discipline} for race: ${row['Versenyszám neve']}`);
          continue;
        }

        // Parse gender
        const genderRaw = row['Versenyszám nem']?.trim().toLowerCase();
        let gender: 'Férfi' | 'Női' | 'Vegyes';
        if (genderRaw.includes('férfi')) {
          gender = 'Férfi';
        } else if (genderRaw.includes('női')) {
          gender = 'Női';
        } else {
          gender = 'Vegyes';
        }

        // Parse age groups (split on ';' and trim)
        const ageGroupsRaw = row['Versenyszám évfolyamok']?.trim() || '';
        const ageGroups = ageGroupsRaw
          .split(';')
          .map(group => group.trim())
          .filter(group => group.length > 0);

        if (ageGroups.length === 0) {
          console.warn(`⚠️ No age groups found for race: ${row['Versenyszám neve']}`);
          continue;
        }

        // Parse occurrence with fallback to 0
        const occurrence = parseInt(String(row['Előfordulás'])) || 0;

        const normalizedRace: NormalizedRaceData = {
          name: row['Versenyszám neve']?.trim() || '',
          discipline: discipline as 'Kajak' | 'Kenu',
          boatClass: row['Hajóosztály']?.trim() || '',  // Use camelCase
          gender,
          distance: row['Versenyszám táv']?.trim() || '',
          occurrence,
          ageGroups  // Use camelCase
        };

        // Validate required fields
        if (!normalizedRace.name || !normalizedRace.boatClass || !normalizedRace.distance) {
          console.warn(`⚠️ Missing required fields for race: ${row['Versenyszám neve']}`);
          continue;
        }

        normalizedData.push(normalizedRace);
        
      } catch (error) {
        console.error(`❌ Error processing race: ${row['Versenyszám neve']}`, error);
      }
    }
    
    console.log(`✅ Successfully normalized ${normalizedData.length} races`);
    return normalizedData;
  }

  private async populateDatabase(normalizedData: NormalizedRaceData[]) {
    console.log('💾 Populating database...');
    
    // Prepare statements for batch operations
    const insertAgeGroupStmt = this.db.prepare(`
      INSERT OR IGNORE INTO age_groups (name) VALUES (?)
    `);
    
    const getAgeGroupIdStmt = this.db.prepare(`
      SELECT id FROM age_groups WHERE name = ?
    `);
    
    const insertRaceStmt = this.db.prepare(`
      INSERT INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);
    
    const insertRaceAgeGroupStmt = this.db.prepare(`
      INSERT OR IGNORE INTO race_age_groups (race_id, age_group_id)
      VALUES (?, ?)
    `);

    // Use transaction for performance and consistency
    const transaction = this.db.transaction(() => {
      let raceCount = 0;
      let ageGroupCount = 0;
      const uniqueAgeGroups = new Set<string>();

      for (const race of normalizedData) {
        try {
          // Insert race
          const raceResult = insertRaceStmt.run(
            race.name,
            race.discipline,
            race.boatClass,  // Use camelCase
            race.gender,
            race.distance,
            race.occurrence
          );
          
          const raceId = raceResult.lastInsertRowid as number;
          raceCount++;

          // Process age groups for this race
          for (const ageGroupName of race.ageGroups) {  // Use camelCase
            // Insert age group (ignore if exists)
            insertAgeGroupStmt.run(ageGroupName);
            uniqueAgeGroups.add(ageGroupName);
            
            // Get age group ID
            const ageGroupRow = getAgeGroupIdStmt.get(ageGroupName) as { id: number };
            if (!ageGroupRow) {
              throw new Error(`Failed to get age group ID for: ${ageGroupName}`);
            }
            
            // Link race to age group
            insertRaceAgeGroupStmt.run(raceId, ageGroupRow.id);
          }

          if (raceCount % 100 === 0) {
            console.log(`📝 Processed ${raceCount} races...`);
          }
          
        } catch (error) {
          console.error(`❌ Error inserting race: ${race.name}`, error);
        }
      }

      ageGroupCount = uniqueAgeGroups.size;
      console.log(`✅ Inserted ${raceCount} races and ${ageGroupCount} unique age groups`);
    });

    transaction();
  }

  private populateLevels() {
    console.log('🏆 Populating levels table...');
    
    // Futamszint data from documents/Futamszint.txt
    const levelsData = [
      // Előfutamok (Preliminaries) - Competition starts here
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

      // Középfutamok (Semifinals) - Middle progression
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

      // Döntők (Finals) - Competition culmination
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

      // Döntő római számokkal (Finals with Roman numerals)
      { name: "Döntő I.", levelType: "döntő", sortOrder: 211, isDefault: true }, // Default level for simplified mode
      { name: "Döntő II.", levelType: "döntő", sortOrder: 212 },
      { name: "Döntő III.", levelType: "döntő", sortOrder: 213 },
      { name: "Döntő IV.", levelType: "döntő", sortOrder: 214 },
      { name: "Döntő V.", levelType: "döntő", sortOrder: 215 },
      { name: "Döntő VI.", levelType: "döntő", sortOrder: 216 },
      { name: "Döntő VII.", levelType: "döntő", sortOrder: 217 },
      { name: "Döntő VIII.", levelType: "döntő", sortOrder: 218 }
    ];

    // Check if levels already exist
    const existingLevels = this.db.prepare('SELECT COUNT(*) as count FROM levels').get() as { count: number };
    
    if (existingLevels.count === 0) {
      console.log('🏁 Inserting levels data...');
      
      // Prepare statement for inserting levels
      const insertLevelStmt = this.db.prepare(`
        INSERT INTO levels (name, level_type, sort_order, is_default)
        VALUES (?, ?, ?, ?)
      `);

      // Use transaction for performance
      const transaction = this.db.transaction(() => {
        for (const levelData of levelsData) {
          insertLevelStmt.run(
            levelData.name,
            levelData.levelType,
            levelData.sortOrder,
            levelData.isDefault ? 1 : 0
          );
        }
      });

      transaction();
      console.log(`✅ Successfully inserted ${levelsData.length} levels`);
    } else {
      console.log(`✅ Levels table already populated with ${existingLevels.count} levels`);
    }
  }

  private verifyResults() {
    console.log('🔍 Verifying database contents...');
    
    const raceCountResult = this.db.prepare('SELECT COUNT(*) as count FROM races').get() as { count: number };
    const ageGroupCountResult = this.db.prepare('SELECT COUNT(*) as count FROM age_groups').get() as { count: number };
    const levelCountResult = this.db.prepare('SELECT COUNT(*) as count FROM levels').get() as { count: number };
    const linkCountResult = this.db.prepare('SELECT COUNT(*) as count FROM race_age_groups').get() as { count: number };
    
    console.log(`📊 Database contents:`);
    console.log(`   - Races: ${raceCountResult.count}`);
    console.log(`   - Age Groups: ${ageGroupCountResult.count}`);
    console.log(`   - Levels: ${levelCountResult.count}`);
    console.log(`   - Race-Age Group Links: ${linkCountResult.count}`);
    
    // Show sample data
    const sampleRaces = this.db.prepare(`
      SELECT r.name, r.occurrence, GROUP_CONCAT(ag.name, '; ') as age_groups
      FROM races r
      JOIN race_age_groups rag ON r.id = rag.race_id
      JOIN age_groups ag ON rag.age_group_id = ag.id
      GROUP BY r.id, r.name, r.occurrence
      ORDER BY r.occurrence DESC
      LIMIT 3
    `).all();
    
    console.log(`\n📋 Sample races with occurrence and age groups:`);
    for (const race of sampleRaces) {
      console.log(`   - ${(race as any).name} (${(race as any).occurrence}x): ${(race as any).age_groups}`);
    }

    // Show default level
    const defaultLevel = this.db.prepare('SELECT * FROM levels WHERE is_default = 1').get();
    if (defaultLevel) {
      console.log(`\n🎯 Default level: ${(defaultLevel as any).name} (ID: ${(defaultLevel as any).id})`);
    }
  }
}

// Run the populator if this script is executed directly
if (require.main === module) {
  // Parse command line arguments for output path
  const args = process.argv.slice(2);
  const outputPathArg = args.find(arg => arg.startsWith('--output='));
  const outputPath = outputPathArg ? outputPathArg.split('=')[1] : undefined;
  
  if (outputPath) {
    console.log(`🎯 Using custom output path: ${outputPath}`);
  } else {
    console.log(`🎯 Using default output path: ${path.join(process.cwd(), 'idorendmaker.db')}`);
  }
  
  const populator = new DatabasePopulator(outputPath);
  populator.run();
}

export default DatabasePopulator;