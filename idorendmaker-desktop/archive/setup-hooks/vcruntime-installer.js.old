#!/usr/bin/env node

/**
 * VC++ Runtime Setup Hook for Squirrel.Windows
 *
 * This script runs before the main application installation to ensure
 * Microsoft Visual C++ Redistributable 2015-2022 is installed.
 *
 * Usage: Called automatically by Squirrel during installation
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn, execSync } = require('child_process');
const os = require('os');

class VCRuntimeInstaller {
  constructor() {
    this.vcRedistUrls = [
      'https://aka.ms/vs/17/release/vc_redist.x64.exe', // Primary Microsoft redirect
      'https://download.microsoft.com/download/1/6/5/165255E7-1014-4D0A-B094-B6A430A6BFFC/vc_redist.x64.exe' // Fallback direct URL
    ];
  }

  /**
   * Main entry point for the VC++ runtime installation
   */
  async install() {
    try {
      console.log('=== VC++ Runtime Installation ===');
      console.log('Checking for Microsoft Visual C++ Redistributable 2015-2022...');

      // Check if already installed
      if (this.isVCRuntimeInstalled()) {
        console.log('✅ VC++ Redistributable is already installed');
        return true;
      }

      console.log('⚠️ VC++ Redistributable not found - installing...');
      return await this.downloadAndInstall();

    } catch (error) {
      console.error('❌ Error during VC++ runtime installation:', error.message);

      // Show user-friendly message and continue installation
      // We don't want to block the main app installation
      console.log('⚠️ Continuing with main application installation...');
      console.log('📝 Note: If the application fails to start, please install');
      console.log('   Microsoft Visual C++ Redistributable manually from:');
      console.log('   https://aka.ms/vs/17/release/vc_redist.x64.exe');

      return false; // Don't block installation
    }
  }

  /**
   * Check if VC++ Redistributable is installed using multiple detection methods
   */
  isVCRuntimeInstalled() {
    if (process.platform !== 'win32') {
      return true; // Not Windows, no need for VC++ runtime
    }

    try {
      // Method 1: Check registry for VC++ 2015-2022 installation
      try {
        const regResult = execSync(
          'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /v Installed',
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
        );

        if (regResult.includes('0x1')) {
          console.log('✅ Found VC++ Redistributable in registry');
          return true;
        }
      } catch (registryError) {
        // Registry check failed, try other methods
      }

      // Method 2: Check for required DLL files
      const windowsDir = process.env.WINDIR || 'C:\\Windows';
      const system32Dir = path.join(windowsDir, 'System32');

      const requiredDlls = [
        'vcruntime140_1.dll',
        'vcruntime140.dll',
        'msvcp140.dll'
      ];

      console.log(`Checking for DLLs in: ${system32Dir}`);

      for (const dll of requiredDlls) {
        const dllPath = path.join(system32Dir, dll);
        if (!fs.existsSync(dllPath)) {
          console.log(`❌ Missing DLL: ${dll}`);
          return false;
        }
        console.log(`✅ Found DLL: ${dll}`);
      }

      return true;

    } catch (error) {
      console.log('⚠️ Error checking VC++ runtime installation:', error.message);
      return false;
    }
  }

  /**
   * Download and install VC++ Redistributable
   */
  async downloadAndInstall() {
    const tempDir = os.tmpdir();
    const fileName = 'vc_redist.x64.exe';
    const filePath = path.join(tempDir, fileName);

    console.log('📥 Downloading VC++ Redistributable...');

    // Try downloading from multiple URLs
    let downloadSuccess = false;
    let lastError = null;

    for (const [index, url] of this.vcRedistUrls.entries()) {
      try {
        console.log(`Trying URL ${index + 1}/${this.vcRedistUrls.length}: ${url}`);
        await this.downloadFile(url, filePath);
        downloadSuccess = true;
        console.log(`✅ Download successful from URL ${index + 1}`);
        break;
      } catch (error) {
        console.log(`❌ Download failed from URL ${index + 1}:`, error.message);
        lastError = error;

        // Clean up partial download
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }
      }
    }

    if (!downloadSuccess) {
      throw lastError || new Error('All download URLs failed');
    }

    // Install the redistributable
    console.log('🔧 Installing VC++ Redistributable...');
    const installSuccess = await this.installRedistributable(filePath);

    // Clean up downloaded file
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    if (installSuccess) {
      console.log('✅ VC++ Redistributable installed successfully');
      return true;
    } else {
      throw new Error('VC++ Redistributable installation failed');
    }
  }

  /**
   * Download a file from URL to destination
   */
  downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destination);

      const request = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(destination);
          return this.downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destination);
          return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();

          // Verify file was downloaded
          if (fs.existsSync(destination)) {
            const stats = fs.statSync(destination);
            if (stats.size > 0) {
              resolve();
            } else {
              fs.unlinkSync(destination);
              reject(new Error('Downloaded file is empty'));
            }
          } else {
            reject(new Error('Downloaded file not found'));
          }
        });

        file.on('error', (error) => {
          file.close();
          fs.unlinkSync(destination);
          reject(error);
        });
      });

      request.on('error', (error) => {
        file.close();
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }
        reject(error);
      });

      request.setTimeout(120000, () => {
        request.destroy();
        file.close();
        if (fs.existsSync(destination)) {
          fs.unlinkSync(destination);
        }
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Install the VC++ Redistributable executable
   */
  installRedistributable(installerPath) {
    return new Promise((resolve) => {
      console.log('🚀 Running VC++ Redistributable installer...');

      // Use silent installation parameters
      const installer = spawn(installerPath, ['/install', '/quiet', '/norestart'], {
        stdio: 'inherit',
        detached: false
      });

      installer.on('close', (code) => {
        console.log(`Installer exited with code: ${code}`);

        // Check return codes
        // 0 = Success
        // 1638 = Already installed (newer or same version)
        // 3010 = Success but restart required
        if (code === 0 || code === 1638 || code === 3010) {
          resolve(true);
        } else {
          console.log(`❌ Installation failed with code: ${code}`);
          resolve(false);
        }
      });

      installer.on('error', (error) => {
        console.log(`❌ Failed to start installer: ${error.message}`);
        resolve(false);
      });
    });
  }
}

// Run the installer if this script is executed directly
if (require.main === module) {
  const installer = new VCRuntimeInstaller();
  installer.install()
    .then((success) => {
      if (success) {
        console.log('🎉 VC++ Runtime setup completed successfully');
        process.exit(0);
      } else {
        console.log('⚠️ VC++ Runtime setup completed with warnings');
        process.exit(0); // Don't block main installation
      }
    })
    .catch((error) => {
      console.error('❌ VC++ Runtime setup failed:', error.message);
      process.exit(0); // Don't block main installation
    });
}

module.exports = VCRuntimeInstaller;