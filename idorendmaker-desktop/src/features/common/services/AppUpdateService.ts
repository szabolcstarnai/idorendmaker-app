import axios from 'axios';
import { app } from 'electron';
import { isNewerVersion, stripVersionPrefix } from '../../../utils/versionCompare';

const REPO_OWNER = 'szabolcstarnai';
const REPO_NAME = 'idorendmaker-app';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
const REQUEST_TIMEOUT_MS = 8000;

export interface AppUpdateCheckResult {
  status: 'up-to-date' | 'update-available' | 'error';
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  message: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  html_url: string;
  name?: string;
}

/**
 * Checks GitHub's "latest release" for a newer app version than the one
 * currently running (issue #50).
 *
 * Deliberately user-triggered only, not polled on startup: this app is
 * commonly run at race venues with no reliable internet connection, and a
 * background network call on every launch would just fail silently there
 * while adding startup latency. This mirrors the same "no automatic
 * polling in v1" design already used for the backend's catalog update
 * check (`CatalogUpdateService`).
 *
 * "Latest release" here is whatever `GET /releases/latest` returns, which
 * GitHub defines as the most recent non-draft, non-prerelease release - a
 * draft or a release explicitly marked "pre-release" is never surfaced by
 * this check.
 */
export async function checkForAppUpdate(): Promise<AppUpdateCheckResult> {
  const currentVersion = app.getVersion();

  try {
    const response = await axios.get<GitHubReleaseResponse>(LATEST_RELEASE_URL, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: { Accept: 'application/vnd.github+json' },
    });

    const latestVersion = stripVersionPrefix(response.data.tag_name);

    if (isNewerVersion(latestVersion, currentVersion)) {
      return {
        status: 'update-available',
        currentVersion,
        latestVersion,
        releaseUrl: response.data.html_url,
        message: `Új verzió érhető el: ${latestVersion} (jelenlegi: ${currentVersion})`,
      };
    }

    return {
      status: 'up-to-date',
      currentVersion,
      latestVersion,
      message: 'A legfrissebb verziót használod.',
    };
  } catch (error) {
    // Most common cause in the field: no internet connection at the venue.
    // Fail quietly and informatively rather than throwing - this is a
    // "nice to know", never something that should block or alarm the user.
    console.error('App update check failed:', error);
    return {
      status: 'error',
      currentVersion,
      message: 'Nem sikerült ellenőrizni a frissítéseket (nincs internetkapcsolat?).',
    };
  }
}
