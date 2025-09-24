import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import * as path from 'path';
import * as fs from 'fs';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Időrend Készítő',
    executableName: 'idorendmaker',
    icon: './assets/icon', // Add your icon path here
    extraResource: [
      // Bundle the GraalVM executables and production database
      'resources/idorendmaker-backend.exe',
      'resources/idorendmaker-pdfprocessor.exe',
      'resources/idorendmaker-production.db'
    ],
    // Squirrel requires these for proper Windows integration
    appBundleId: 'hu.szabolcst.idorendmaker',
    appCategoryType: 'public.app-category.productivity',
    win32metadata: {
      CompanyName: 'Szabolcs Tárnai',
      FileDescription: 'Időrend Készítő - Kajak-kenu verseny időrend készítő alkalmazás',
      ProductName: 'Időrend Készítő',
      InternalName: 'idorendmaker'
    }
  },
  hooks: {
    preMake: async () => {
      console.log('🔧 Pre-make hook: Validating resources for installer...');
      await validateResources();
    }
  },
  rebuildConfig: {},
  makers: [
    // Squirrel for Windows - primary installer
    new MakerSquirrel({
      name: 'idorendmaker',
      authors: 'Szabolcs Tárnai',
      description: 'Kajak-kenu verseny időrend készítő alkalmazás',
      // Squirrel.Windows specific configuration
      setupExe: 'IdorendMakerSetup.exe',
      setupIcon: './assets/icon.ico', // Add your icon path here if available
      skipUpdateIcon: true,
      // Setup hooks for VC++ runtime installation
      setupMsi: undefined, // Use EXE installer
      // Note: VC++ runtime installation will be handled by the VCRuntimeService
      // in the main application on first startup, as Squirrel.Windows has
      // limited support for pre-installation hooks
    }),
    // Additional makers for other platforms
    new MakerZIP({}, ['darwin', 'linux']),
    new MakerDeb({
      options: {
        name: 'idorendmaker',
        productName: 'Időrend Készítő',
        description: 'Kajak-kenu verseny időrend készítő alkalmazás',
        homepage: 'https://github.com/your-repo', // Update this
        maintainer: 'Szabolcs Tárnai <tarnai.szabolcs01@gmail.com>',
        categories: ['Office', 'Utility']
      }
    }),
    new MakerRpm({
      options: {
        name: 'idorendmaker',
        productName: 'Időrend Készítő',
        description: 'Kajak-kenu verseny időrend készítő alkalmazás',
        homepage: 'https://github.com/your-repo', // Update this
        categories: ['Office', 'Utility']
      }
    })
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
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
 * Validate that all required resources are present and valid
 */
async function validateResources(): Promise<void> {
  console.log('🔍 Validating resources...');

  const resourcesDir = path.resolve(__dirname, 'resources');

  // Ensure resources directory exists
  if (!fs.existsSync(resourcesDir)) {
    throw new Error(`Resources directory not found: ${resourcesDir}\nPlease create it and add the required files.`);
  }

  const requiredFiles = [
    'idorendmaker-backend.exe',
    'idorendmaker-pdfprocessor.exe',
    'idorendmaker-production.db'
  ];

  for (const fileName of requiredFiles) {
    const filePath = path.join(resourcesDir, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Required resource missing: ${fileName}\nPlease add it to the resources directory.`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error(`Resource file is empty: ${fileName}`);
    }

    console.log(`✅ ${fileName} validated (${stats.size.toLocaleString()} bytes)`);
  }

  console.log('🎉 All resources validated successfully');
}

export default config;