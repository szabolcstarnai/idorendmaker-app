/**
 * Database Initialization Service
 * 
 * Handles database location management for both development and production:
 * - Development: Uses database in project directory (shared with backend)
 * - Production: Uses database in userData directory, copies from bundle if needed
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';

export interface DatabaseConfig {
  path: string;
  isProduction: boolean;
  wasInitialized: boolean;
}

export class DatabaseInitializer {
  private static readonly DATABASE_FILENAME = 'idorendmaker.db';
  private static readonly BUNDLED_DB_FILENAME = 'idorendmaker-production.db'; // Name in the bundle

  /**
   * Initialize the database based on the environment
   * Returns the database path that should be used by the application
   */
  static async initialize(): Promise<DatabaseConfig> {
    const isProduction = app.isPackaged;
    
    if (isProduction) {
      return await this.initializeProductionDatabase();
    } else {
      return await this.initializeDevelopmentDatabase();
    }
  }

  /**
   * Development database initialization
   * Uses the database in the project directory (shared with backend)
   */
  private static async initializeDevelopmentDatabase(): Promise<DatabaseConfig> {
    console.log('🔧 Initializing development database...');
    
    // In development, use the project directory database
    const projectRoot = process.cwd();
    const dbPath = path.join(projectRoot, this.DATABASE_FILENAME);
    
    console.log(`📂 Development database path: ${dbPath}`);
    
    // Check if database exists
    const exists = fsSync.existsSync(dbPath);
    if (!exists) {
      console.log('⚠️ Development database does not exist');
      console.log('💡 Run "npm run populate-db" to create and populate the database');
    } else {
      console.log('✅ Development database found');
    }

    return {
      path: dbPath,
      isProduction: false,
      wasInitialized: !exists
    };
  }

  /**
   * Production database initialization
   * Uses userData directory, copies from bundle if needed
   */
  private static async initializeProductionDatabase(): Promise<DatabaseConfig> {
    console.log('🏭 Initializing production database...');
    
    // Get userData directory (persistent across app updates)
    const userDataDir = app.getPath('userData');
    const dbPath = path.join(userDataDir, this.DATABASE_FILENAME);
    
    console.log(`📂 Production database path: ${dbPath}`);
    
    // Ensure userData directory exists
    await fs.mkdir(userDataDir, { recursive: true });
    
    // Check if database already exists
    const exists = await this.fileExists(dbPath);
    let wasInitialized = false;
    
    if (!exists) {
      console.log('🚀 First-time initialization: copying database from bundle...');
      await this.copyDatabaseFromBundle(dbPath);
      wasInitialized = true;
      console.log('✅ Database successfully copied to userData directory');
    } else {
      console.log('✅ Production database already exists in userData directory');
    }

    return {
      path: dbPath,
      isProduction: true,
      wasInitialized
    };
  }

  /**
   * Copy the pre-populated database from the app bundle to userData directory
   */
  private static async copyDatabaseFromBundle(destinationPath: string): Promise<void> {
    // In packaged apps, extra resources are in the resources folder next to the app
    // Get the resource path using Electron's process.resourcesPath
    let bundledDbPath: string;
    
    if (process.resourcesPath) {
      // Production: resources are in the app bundle
      bundledDbPath = path.join(process.resourcesPath, this.BUNDLED_DB_FILENAME);
    } else {
      // Fallback: development or non-standard setup
      const appPath = app.getAppPath();
      bundledDbPath = path.join(appPath, '..', 'resources', this.BUNDLED_DB_FILENAME);
    }
    
    console.log(`📋 Copying database from: ${bundledDbPath}`);
    console.log(`📋 Copying database to: ${destinationPath}`);
    
    // Check if bundled database exists
    const bundledExists = await this.fileExists(bundledDbPath);
    if (!bundledExists) {
      throw new Error(`Bundled database not found at: ${bundledDbPath}. Make sure the build process created it.`);
    }
    
    // Copy the database file
    await fs.copyFile(bundledDbPath, destinationPath);
    
    // Verify the copy was successful
    const copyExists = await this.fileExists(destinationPath);
    if (!copyExists) {
      throw new Error(`Failed to copy database to: ${destinationPath}`);
    }
    
    // Verify the copied database has content
    const stats = await fs.stat(destinationPath);
    console.log(`✅ Database copy completed successfully (${stats.size} bytes)`);
  }

  /**
   * Check if a file exists (async version)
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the expected database path for the current environment
   * This method can be called without initialization for path resolution
   */
  static getDatabasePath(): string {
    const isProduction = app.isPackaged;
    
    if (isProduction) {
      const userDataDir = app.getPath('userData');
      return path.join(userDataDir, this.DATABASE_FILENAME);
    } else {
      const projectRoot = process.cwd();
      return path.join(projectRoot, this.DATABASE_FILENAME);
    }
  }

  /**
   * Validate database accessibility
   */
  static async validateDatabase(dbPath: string): Promise<boolean> {
    try {
      // Check if file exists and is readable
      await fs.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      
      // Basic file size check (should be > 0 bytes)
      const stats = await fs.stat(dbPath);
      if (stats.size === 0) {
        console.error('❌ Database file is empty');
        return false;
      }
      
      console.log(`✅ Database validation passed (${stats.size} bytes)`);
      return true;
    } catch (error) {
      console.error('❌ Database validation failed:', error);
      return false;
    }
  }
}