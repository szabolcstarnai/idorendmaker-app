/**
 * Version comparison utilities
 * Handles semantic versioning in the format YYYY.M.P (e.g., 2025.9.2)
 */

/**
 * Compares two version strings
 * @param current Current version (e.g., "2025.9.2")
 * @param latest Latest version (e.g., "2025.10.1")
 * @returns -1 if current < latest, 0 if equal, 1 if current > latest
 */
export function compareVersions(current: string, latest: string): number {
  // Remove 'v' prefix if present
  const cleanCurrent = current.replace(/^v/, '');
  const cleanLatest = latest.replace(/^v/, '');

  const currentParts = cleanCurrent.split('.').map(Number);
  const latestParts = cleanLatest.split('.').map(Number);

  // Compare each part
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0; // Versions are equal
}

/**
 * Checks if an update is available
 * @param currentVersion Current app version
 * @param latestVersion Latest release version
 * @returns true if update is available (latest > current)
 */
export function isUpdateAvailable(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) < 0;
}

/**
 * Normalizes version string (removes 'v' prefix)
 * @param version Version string (e.g., "v2025.9.2" or "2025.9.2")
 * @returns Normalized version without prefix (e.g., "2025.9.2")
 */
export function normalizeVersion(version: string): string {
  return version.replace(/^v/, '');
}
