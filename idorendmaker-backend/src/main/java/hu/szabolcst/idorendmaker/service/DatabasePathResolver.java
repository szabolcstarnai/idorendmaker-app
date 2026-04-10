package hu.szabolcst.idorendmaker.service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Service responsible for resolving the correct database file path
 * based on the current environment (development vs production).
 *
 * Since Phase 1 of the catalog/user split, this resolver exposes two public
 * methods: {@link #resolveUserDbPath()} and {@link #resolveCatalogDbPath()}.
 * Both share the same dev/prod/Windows fallback logic, parameterized by the
 * target filename.
 */
@Slf4j
@Service
public class DatabasePathResolver {

    @Value("${app.database.mode:production}")
    private String databaseMode;

    /**
     * @deprecated Use {@code app.database.development.relative-dir} together with
     * {@code app.database.user.filename} / {@code app.database.catalog.filename}.
     * Phase 9 will remove this property entirely.
     */
    @Deprecated
    @Value("${app.database.development.relative-path:../../idorendmaker-desktop/idorendmaker.db}")
    private String developmentRelativePath;

    @Value("${app.database.development.relative-dir:../../idorendmaker-desktop}")
    private String developmentRelativeDir;

    @Value("${app.database.production.app-name:idorendmaker}")
    private String productionAppName;

    @Value("${app.database.production.filename:idorendmaker.db}")
    private String productionFilename;

    @Value("${app.database.user.filename:user.db}")
    private String userFilename;

    @Value("${app.database.catalog.filename:catalog.db}")
    private String catalogFilename;

    @Value("${app.database.override-path:#{null}}")
    private String overridePath;

    /**
     * Resolves the absolute path to the user database (read/write).
     */
    public String resolveUserDbPath() {
        return resolvePathFor(userFilename);
    }

    /**
     * Resolves the absolute path to the catalog database (read-only at runtime,
     * rewritten only by the catalog update service).
     */
    public String resolveCatalogDbPath() {
        return resolvePathFor(catalogFilename);
    }

    /**
     * Shared resolution logic for both user.db and catalog.db.
     *
     * Priority:
     * 1. Environment variable override (app.database.override-path) — only honored
     *    as a raw filesystem path for the user DB historically; applied here for
     *    both paths by appending the filename when the override points at a dir,
     *    or returning it as-is when it already ends with the requested filename.
     * 2. Development mode: {@code <development.relative-dir>/<filename>}
     * 3. Production mode: OS-specific user data directory + filename
     */
    private String resolvePathFor(final String filename) {
        // Priority 1: Override path (for testing/debugging). The override is a
        // directory in the new world; if it happens to already end with the
        // requested filename we honor it as-is for backward compatibility.
        if (overridePath != null && !overridePath.isEmpty()) {
            final File asFile = new File(overridePath);
            if (asFile.getName().equalsIgnoreCase(filename)) {
                log.info("Using override database path: {}", overridePath);
                return overridePath;
            }
            final String resolved = Paths.get(overridePath, filename).toAbsolutePath().toString();
            log.info("Using override database directory: {} -> {}", overridePath, resolved);
            return resolved;
        }

        // Priority 2: Development mode
        if ("development".equals(databaseMode)) {
            return resolveDevelopmentPath(filename);
        }

        // Priority 3: Production mode
        return resolveProductionPath(filename);
    }

    /**
     * Resolves a database file path for development environment.
     *
     * Looks in {@code developmentRelativeDir} (default {@code ../../idorendmaker-desktop})
     * relative to the backend working dir. Automatically detects if running from a
     * {@code target/} directory and adjusts.
     */
    private String resolveDevelopmentPath(final String filename) {
        final String currentDir = System.getProperty("user.dir");
        final Path currentPath = Paths.get(currentDir);

        log.info("Development database path resolution for '{}':", filename);
        log.info("   Current directory: {}", currentDir);
        log.info("   Configured relative dir: {}", developmentRelativeDir);

        // Try the configured dir first
        Path dbPath = Paths.get(currentDir, developmentRelativeDir, filename).normalize();
        String absolutePath = dbPath.toAbsolutePath().toString();

        if (new File(absolutePath).exists()) {
            log.info("Database found at configured path: {}", absolutePath);
            return absolutePath;
        }

        // If not found and we're in a 'target' directory, try adjusting the path
        if (currentPath.endsWith("target")) {
            log.info("Running from target directory, adjusting path...");
            final String adjustedRelativeDir = "../" + developmentRelativeDir;
            dbPath = Paths.get(currentDir, adjustedRelativeDir, filename).normalize();
            absolutePath = dbPath.toAbsolutePath().toString();
            log.info("   Adjusted absolute path: {}", absolutePath);
            if (new File(absolutePath).exists()) {
                log.info("Database found at adjusted path: {}", absolutePath);
                return absolutePath;
            }
        }

        // Try alternative paths for different execution contexts
        final Path projectRoot = findProjectRoot(currentPath);
        if (projectRoot != null) {
            dbPath = projectRoot.resolve("idorendmaker-desktop").resolve(filename);
            absolutePath = dbPath.toAbsolutePath().toString();
            log.info("   Alternative path (from project root): {}", absolutePath);
            if (new File(absolutePath).exists()) {
                log.info("Database found at project root path: {}", absolutePath);
                return absolutePath;
            }
        }

        // Return a best-effort path, preferring the project root if found, so new
        // files get created alongside the desktop project as intended.
        if (projectRoot != null) {
            dbPath = projectRoot.resolve("idorendmaker-desktop").resolve(filename);
            absolutePath = dbPath.toAbsolutePath().toString();
        } else {
            dbPath = Paths.get(currentDir, developmentRelativeDir, filename).normalize();
            absolutePath = dbPath.toAbsolutePath().toString();
        }

        // Ensure the parent directory exists so a fresh file can be created there.
        final File parent = new File(absolutePath).getParentFile();
        if (parent != null && !parent.exists()) {
            log.info("Creating development database directory: {}", parent.getAbsolutePath());
            parent.mkdirs();
        }

        log.warn("Database not found, returning best-effort path: {}", absolutePath);
        return absolutePath;
    }

    /**
     * Find the project root directory by looking for characteristic files/directories.
     */
    private Path findProjectRoot(final Path startPath) {
        Path current = startPath;

        for (int i = 0; i < 5 && current != null; i++) {
            final Path backendDir = current.resolve("idorendmaker-backend");
            final Path desktopDir = current.resolve("idorendmaker-desktop");

            if (Files.exists(backendDir) && Files.exists(desktopDir)) {
                log.info("Found project root: {}", current.toAbsolutePath());
                return current;
            }

            current = current.getParent();
        }

        log.warn("Could not find project root from: {}", startPath);
        return null;
    }

    /**
     * Resolves a database file path for production environment.
     * Uses OS-specific user data directories.
     */
    private String resolveProductionPath(final String filename) {
        final String os = System.getProperty("os.name").toLowerCase();

        if (os.contains("win")) {
            return resolveWindowsProductionPath(filename);
        }

        final String userDataDir = getUserDataDirectory();
        final Path dbPath = Paths.get(userDataDir, filename);
        final String absolutePath = dbPath.toAbsolutePath().toString();

        log.info("Production database path resolution for '{}':", filename);
        log.info("   User data directory: {}", userDataDir);
        log.info("   Resolved path: {}", absolutePath);
        log.info("   Database exists: {}", new File(absolutePath).exists());

        final File parentDir = new File(userDataDir);
        if (!parentDir.exists()) {
            log.info("Creating user data directory: {}", userDataDir);
            parentDir.mkdirs();
        }

        return absolutePath;
    }

    /**
     * Resolves a database file path for Windows production environment.
     *
     * Tries multiple legacy locations; if none contain the requested file, falls
     * back to the first preferred location and ensures its directory exists.
     */
    private String resolveWindowsProductionPath(final String filename) {
        final String userHome = System.getProperty("user.home");
        final String localAppData = System.getenv("LOCALAPPDATA");
        final String appData = System.getenv("APPDATA");

        final String[] baseDirectories = {
            appData != null ? appData : Paths.get(userHome, "AppData", "Roaming").toString(),
            appData != null ? appData : Paths.get(userHome, "AppData", "Roaming").toString(),
            localAppData != null ? localAppData : Paths.get(userHome, "AppData", "Local").toString(),
            localAppData != null ? localAppData : Paths.get(userHome, "AppData", "Local").toString()
        };

        final String[] appFolderNames = {
            "idorendmaker",
            "idorendmaker-desktop",
            "idorendmaker",
            "idorendmaker-desktop"
        };

        log.info("Windows production database path resolution for '{}':", filename);
        log.info("   APPDATA: {}", appData);
        log.info("   LOCALAPPDATA: {}", localAppData);

        for (int i = 0; i < baseDirectories.length; i++) {
            final Path dbPath = Paths.get(baseDirectories[i], appFolderNames[i], filename);
            final String absolutePath = dbPath.toAbsolutePath().toString();
            log.info("   Checking: {}", absolutePath);

            if (new File(absolutePath).exists()) {
                log.info("Database found at: {}", absolutePath);
                return absolutePath;
            }
        }

        final Path defaultPath = Paths.get(baseDirectories[0], appFolderNames[0], filename);
        final String defaultAbsolutePath = defaultPath.toAbsolutePath().toString();
        log.info("No existing database found, using default path: {}", defaultAbsolutePath);

        final File parentDir = new File(Paths.get(baseDirectories[0], appFolderNames[0]).toString());
        if (!parentDir.exists()) {
            log.info("Creating app data directory: {}", parentDir.getAbsolutePath());
            parentDir.mkdirs();
        }

        return defaultAbsolutePath;
    }

    /**
     * Gets the OS-specific user data directory.
     * Follows Electron's {@code app.getPath('userData')} logic.
     */
    private String getUserDataDirectory() {
        final String os = System.getProperty("os.name").toLowerCase();
        final String userHome = System.getProperty("user.home");

        if (os.contains("win")) {
            final String appData = System.getenv("APPDATA");
            return appData != null
                ? Paths.get(appData, productionAppName).toString()
                : Paths.get(userHome, "AppData", "Roaming", productionAppName).toString();
        } else if (os.contains("mac")) {
            return Paths.get(userHome, "Library", "Application Support", productionAppName).toString();
        } else {
            return Paths.get(userHome, ".config", productionAppName).toString();
        }
    }
}
