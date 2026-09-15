import path from 'path';
import { promises as fs } from 'fs';

/**
 * Finds a Maven-built jar in a `target/` directory for development mode,
 * without hardcoding its version.
 *
 * `mvn package` always produces a versioned filename
 * (`idorendmaker-backend-2.0.0.jar`), never the bare `idorendmaker-backend.jar`
 * a naive dev-mode candidate path might assume - that bare name only exists
 * after the packaging scripts (`scripts/build-*.js`) copy+rename it into
 * `idorendmaker-desktop/resources/` for a packaged build. A dev-mode
 * candidate that hardcodes the current version (as `BackendService.ts` used
 * to) silently breaks the next time `pom.xml`'s `<version>` changes; a
 * candidate that assumes the bare unversioned name (as `PDFProcessorService.ts`
 * did, see #62) never resolves at all when running straight from a Maven
 * build. This scans for whatever versioned jar is actually there instead.
 *
 * @param targetDir absolute path to the module's `target/` directory
 * @param jarPrefix the jar's artifact name, e.g. `idorendmaker-backend`
 * @returns the resolved absolute path, or `null` if no matching jar exists
 */
export async function findDevJar(targetDir: string, jarPrefix: string): Promise<string | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(targetDir);
  } catch {
    return null;
  }

  const match = entries.find(name =>
    name.startsWith(jarPrefix) &&
    name.endsWith('.jar') &&
    !name.endsWith('-sources.jar') &&
    !name.endsWith('-javadoc.jar') &&
    !name.includes('.original')
  );

  return match ? path.join(targetDir, match) : null;
}
