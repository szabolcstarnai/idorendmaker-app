import axios from 'axios';
import { isUpdateAvailable, normalizeVersion } from '../../../utils/versionUtils';

export interface ReleaseInfo {
  tagName: string;
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: Date;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseInfo?: ReleaseInfo;
  error?: string;
}

/**
 * Service for checking app updates from GitHub releases
 */
export class UpdateService {
  private static readonly GITHUB_API_URL = 'https://api.github.com/repos/szabolcstarnai/idorendmaker-app/releases/latest';
  private static readonly INSTALLER_NAME_PATTERN = /Idorend\.keszito\.Setup\.\d+\.\d+\.\d+\.exe$/i;

  /**
   * Check for available updates
   * @param currentVersion Current app version (e.g., "2025.9.2")
   * @returns Update check result with release info if available
   */
  static async checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
    try {
      console.log(`🔍 Checking for updates... Current version: ${currentVersion}`);

      // Fetch latest release from GitHub
      const response = await axios.get(this.GITHUB_API_URL, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Idorendmaker-App'
        }
      });

      const release = response.data;
      const latestVersion = normalizeVersion(release.tag_name);

      console.log(`📦 Latest release found: ${latestVersion}`);

      // Check if update is available
      const updateAvailable = isUpdateAvailable(currentVersion, latestVersion);

      if (!updateAvailable) {
        console.log('✅ App is up to date');
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion
        };
      }

      // Find installer asset
      const installerAsset = this.findInstallerAsset(release.assets);

      if (!installerAsset) {
        console.warn('⚠️ Update available but installer not found in release assets');
        return {
          updateAvailable: false,
          currentVersion,
          latestVersion,
          error: 'Installer not found in release'
        };
      }

      console.log(`✨ Update available: ${latestVersion} (download: ${installerAsset.browser_download_url})`);

      return {
        updateAvailable: true,
        currentVersion,
        latestVersion,
        releaseInfo: {
          tagName: release.tag_name,
          version: latestVersion,
          releaseUrl: release.html_url,
          downloadUrl: installerAsset.browser_download_url,
          releaseName: release.name || `Version ${latestVersion}`,
          releaseNotes: this.sanitizeReleaseNotes(release.body || 'Új verzió elérhető.'),
          publishedAt: new Date(release.published_at)
        }
      };
    } catch (error) {
      // Network errors, API errors, etc.
      if (axios.isAxiosError(error)) {
        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
          console.log('ℹ️ Cannot check for updates: No internet connection');
          return {
            updateAvailable: false,
            currentVersion,
            error: 'network'
          };
        }
        console.error('❌ Failed to check for updates:', error.message);
      } else {
        console.error('❌ Unexpected error checking for updates:', error);
      }

      return {
        updateAvailable: false,
        currentVersion,
        error: 'unknown'
      };
    }
  }

  /**
   * Find the installer asset in release assets
   * @param assets Array of release assets
   * @returns Installer asset or null if not found
   */
  private static findInstallerAsset(assets: any[]): any | null {
    if (!Array.isArray(assets)) {
      return null;
    }

    return assets.find(asset =>
      asset.name && this.INSTALLER_NAME_PATTERN.test(asset.name)
    ) || null;
  }

  /**
   * Sanitize release notes
   * @param notes Raw release notes
   * @returns Sanitized notes (preserves full content for scrolling)
   */
  private static sanitizeReleaseNotes(notes: string): string {
    // Remove excessive whitespace and normalize line breaks
    return notes.trim().replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Check if a version should be skipped
   * @param version Version to check
   * @returns true if version is marked as skipped
   */
  static isVersionSkipped(version: string): boolean {
    try {
      const skippedVersion = localStorage.getItem('skippedUpdateVersion');
      return skippedVersion === version;
    } catch {
      return false;
    }
  }

  /**
   * Mark a version as skipped
   * @param version Version to skip
   */
  static skipVersion(version: string): void {
    try {
      localStorage.setItem('skippedUpdateVersion', version);
      console.log(`📌 Skipped version: ${version}`);
    } catch (error) {
      console.warn('Failed to save skipped version:', error);
    }
  }

  /**
   * Clear skipped version (e.g., when user manually checks for updates)
   */
  static clearSkippedVersion(): void {
    try {
      localStorage.removeItem('skippedUpdateVersion');
    } catch (error) {
      console.warn('Failed to clear skipped version:', error);
    }
  }
}
