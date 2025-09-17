import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: [
      // Bundle the GraalVM PDF processor executable
      '../idorendhelper-backend/target/idorendhelper.exe',
      // Bundle the pre-populated database for production
      'idorendmaker-production.db'
    ],
  },
  hooks: {
    preMake: async () => {
      console.log('🔧 Pre-make hook: Creating production database...');
      await createProductionDatabase();
    },
    postMake: async () => {
      console.log('🧹 Post-make hook: Cleaning up temporary files...');
      await cleanupProductionDatabase();
    }
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({})],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

/**
 * Create a pre-populated production database for bundling with the app
 */
async function createProductionDatabase(): Promise<void> {
  const outputPath = path.resolve(__dirname, 'idorendmaker-production.db');
  
  console.log(`📂 Creating production database at: ${outputPath}`);
  
  // Remove existing production database if it exists
  if (fs.existsSync(outputPath)) {
    console.log('🗑️ Removing existing production database...');
    fs.unlinkSync(outputPath);
  }
  
  return new Promise<void>((resolve, reject) => {
    // Run the populate-db script with custom output path
    const populateScript = path.resolve(__dirname, 'scripts', 'populate-db.ts');
    const tsxPath = path.resolve(__dirname, 'node_modules', '.bin', 'tsx');
    
    console.log(`🚀 Running populate script: ${populateScript}`);
    console.log(`📍 Output path: ${outputPath}`);
    
    const child = spawn('node', [tsxPath, populateScript, `--output=${outputPath}`], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        // Verify the database was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          console.log(`✅ Production database created successfully (${stats.size} bytes)`);
          resolve();
        } else {
          reject(new Error('Production database was not created'));
        }
      } else {
        reject(new Error(`Population script failed with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Failed to start population script: ${error.message}`));
    });
  });
}

/**
 * Clean up temporary production database after packaging
 */
async function cleanupProductionDatabase(): Promise<void> {
  const outputPath = path.resolve(__dirname, 'idorendmaker-production.db');
  
  if (fs.existsSync(outputPath)) {
    console.log('🗑️ Cleaning up production database...');
    fs.unlinkSync(outputPath);
    console.log('✅ Production database cleanup completed');
  } else {
    console.log('ℹ️ No production database to clean up');
  }
}

export default config;
