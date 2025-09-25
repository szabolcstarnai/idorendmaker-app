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
 * based on the current environment (development vs production)
 */
@Slf4j
@Service
public class DatabasePathResolver {

    @Value("${app.database.mode:production}")
    private String databaseMode;
    
    @Value("${app.database.development.relative-path:../idorendmaker-desktop/idorendmaker.db}")
    private String developmentRelativePath;
    
    @Value("${app.database.production.app-name:idorendmaker}")
    private String productionAppName;
    
    @Value("${app.database.production.filename:idorendmaker.db}")
    private String productionFilename;
    
    @Value("${app.database.override-path:#{null}}")
    private String overridePath;

    /**
     * Resolves the database file path based on current configuration
     * 
     * Priority:
     * 1. Environment variable override (app.database.override-path)
     * 2. Development mode: relative path to desktop project  
     * 3. Production mode: OS-specific user data directory
     */
    public String resolveDatabasePath() {
        // Priority 1: Override path (for testing/debugging)
        if (overridePath != null && !overridePath.isEmpty()) {
            log.info("🔧 Using override database path: {}", overridePath);
            return overridePath;
        }
        
        // Priority 2: Development mode
        if ("development".equals(databaseMode)) {
            return resolveDevelopmentPath();
        }
        
        // Priority 3: Production mode
        return resolveProductionPath();
    }
    
    /**
     * Resolves database path for development environment
     * Looks for database in desktop project directory relative to backend
     * Automatically detects if running from target/ directory and adjusts path accordingly
     */
    private String resolveDevelopmentPath() {
        final String currentDir = System.getProperty("user.dir");
        final Path currentPath = Paths.get(currentDir);
        
        log.info("🔧 Development database path resolution:");
        log.info("   Current directory: {}", currentDir);
        log.info("   Configured relative path: {}", developmentRelativePath);
        
        // Try the configured path first
        Path dbPath = Paths.get(currentDir, developmentRelativePath).normalize();
        String absolutePath = dbPath.toAbsolutePath().toString();
        
        // Check if database exists at the configured path
        if (new File(absolutePath).exists()) {
            log.info("✅ Database found at configured path: {}", absolutePath);
            return absolutePath;
        }
        
        // If not found and we're in a 'target' directory, try adjusting the path
        if (currentPath.endsWith("target")) {
            log.info("🔍 Running from target directory, adjusting path...");
            
            // Go up one more level: target -> backend -> project root -> desktop
            final String adjustedRelativePath = "../" + developmentRelativePath;
            dbPath = Paths.get(currentDir, adjustedRelativePath).normalize();
            absolutePath = dbPath.toAbsolutePath().toString();
            
            log.info("   Adjusted relative path: {}", adjustedRelativePath);
            log.info("   Adjusted absolute path: {}", absolutePath);
            
            if (new File(absolutePath).exists()) {
                log.info("✅ Database found at adjusted path: {}", absolutePath);
                return absolutePath;
            }
        }
        
        // Try alternative paths for different execution contexts
        final Path projectRoot = findProjectRoot(currentPath);
        if (projectRoot != null) {
            dbPath = projectRoot.resolve("idorendmaker-desktop/idorendmaker.db");
            absolutePath = dbPath.toAbsolutePath().toString();
            log.info("   Alternative path (from project root): {}", absolutePath);
            
            if (new File(absolutePath).exists()) {
                log.info("✅ Database found at project root path: {}", absolutePath);
                return absolutePath;
            }
        }
        
        // Return the originally configured path even if it doesn't exist
        // This allows for better error messages and potential database creation
        dbPath = Paths.get(currentDir, developmentRelativePath).normalize();
        absolutePath = dbPath.toAbsolutePath().toString();
        log.warn("⚠️ Database not found, returning configured path: {}", absolutePath);
        
        return absolutePath;
    }
    
    /**
     * Find the project root directory by looking for characteristic files/directories
     */
    private Path findProjectRoot(final Path startPath) {
        Path current = startPath;

        for (int i = 0; i < 5 && current != null; i++) {

            final Path backendDir = current.resolve("idorendmaker-backend");
            final Path desktopDir = current.resolve("idorendmaker-desktop");
            
            if (Files.exists(backendDir) && Files.exists(desktopDir)) {
                log.info("📁 Found project root: {}", current.toAbsolutePath());
                return current;
            }
            
            current = current.getParent();
        }
        
        log.warn("📁 Could not find project root from: {}", startPath);
        return null;
    }
    
    /**
     * Resolves database path for production environment
     * Uses OS-specific user data directories
     */
    private String resolveProductionPath() {
        final String os = System.getProperty("os.name").toLowerCase();

        // Use Windows-specific multi-path resolution
        if (os.contains("win")) {
            return resolveWindowsProductionPaths();
        }

        // Use original logic for macOS and Linux
        final String userDataDir = getUserDataDirectory();
        final Path dbPath = Paths.get(userDataDir, productionFilename);
        final String absolutePath = dbPath.toAbsolutePath().toString();

        log.info("🏭 Production database path resolution:");
        log.info("   User data directory: {}", userDataDir);
        log.info("   Database filename: {}", productionFilename);
        log.info("   Resolved path: {}", absolutePath);
        log.info("   Database exists: {}", new File(absolutePath).exists());

        // Ensure the directory exists
        final File parentDir = new File(userDataDir);
        if (!parentDir.exists()) {
            log.info("📁 Creating user data directory: {}", userDataDir);
            parentDir.mkdirs();
        }

        return absolutePath;
    }
    
    /**
     * Resolves database path for Windows production environment
     * Tries multiple locations in priority order:
     * 1. LOCALAPPDATA\idorendmaker\{idorendmaker.db, idorendmaker-production.db}
     * 2. LOCALAPPDATA\idorendmaker-desktop\{idorendmaker.db, idorendmaker-production.db}
     * 3. APPDATA\idorendmaker\{idorendmaker.db, idorendmaker-production.db}
     * 4. APPDATA\idorendmaker-desktop\{idorendmaker.db, idorendmaker-production.db}
     */
    private String resolveWindowsProductionPaths() {
        final String userHome = System.getProperty("user.home");
        final String localAppData = System.getenv("LOCALAPPDATA");
        final String appData = System.getenv("APPDATA");

        // Base directories to try (in priority order)
        final String[] baseDirectories = {
            appData != null ? appData : Paths.get(userHome, "AppData", "Roaming").toString(),
            appData != null ? appData : Paths.get(userHome, "AppData", "Roaming").toString(),
            localAppData != null ? localAppData : Paths.get(userHome, "AppData", "Local").toString(),
            localAppData != null ? localAppData : Paths.get(userHome, "AppData", "Local").toString()
        };

        // App folder names to try
        final String[] appFolderNames = {
            "idorendmaker",
            "idorendmaker-desktop",
            "idorendmaker",
            "idorendmaker-desktop"
        };

        // Database filenames to try
        final String[] dbFilenames = {"idorendmaker.db", "idorendmaker-production.db"};

        log.info("🏭 Windows production database path resolution:");
        log.info("   APPDATA: {}", appData);
        log.info("   LOCALAPPDATA: {}", localAppData);

        // Try all combinations
        for (int i = 0; i < baseDirectories.length; i++) {
            final String baseDir = baseDirectories[i];
            final String appFolder = appFolderNames[i];

            for (final String dbFilename : dbFilenames) {
                final Path dbPath = Paths.get(baseDir, appFolder, dbFilename);
                final String absolutePath = dbPath.toAbsolutePath().toString();
                final File dbFile = new File(absolutePath);

                log.info("   Checking: {}", absolutePath);

                if (dbFile.exists()) {
                    log.info("✅ Database found at: {}", absolutePath);
                    return absolutePath;
                }
            }
        }

        // No existing database found, return the first path for database creation
        final String firstBaseDir = baseDirectories[0];
        final String firstAppFolder = appFolderNames[0];
        final String firstDbFilename = dbFilenames[0];
        final Path defaultPath = Paths.get(firstBaseDir, firstAppFolder, firstDbFilename);
        final String defaultAbsolutePath = defaultPath.toAbsolutePath().toString();

        log.info("⚠️ No existing database found, using default path: {}", defaultAbsolutePath);

        // Ensure the directory exists
        final File parentDir = new File(Paths.get(firstBaseDir, firstAppFolder).toString());
        if (!parentDir.exists()) {
            log.info("📁 Creating app data directory: {}", parentDir.getAbsolutePath());
            parentDir.mkdirs();
        }

        return defaultAbsolutePath;
    }

    /**
     * Gets the OS-specific user data directory
     * Follows Electron's app.getPath('userData') logic
     */
    private String getUserDataDirectory() {
        final String os = System.getProperty("os.name").toLowerCase();
        final String userHome = System.getProperty("user.home");
        
        if (os.contains("win")) {
            // Windows: %APPDATA%\{appName}
            final String appData = System.getenv("APPDATA");
            return appData != null 
                ? Paths.get(appData, productionAppName).toString()
                : Paths.get(userHome, "AppData", "Roaming", productionAppName).toString();
        } else if (os.contains("mac")) {
            // macOS: ~/Library/Application Support/{appName}
            return Paths.get(userHome, "Library", "Application Support", productionAppName).toString();
        } else {
            // Linux: ~/.config/{appName}
            return Paths.get(userHome, ".config", productionAppName).toString();
        }
    }
    
    /**
     * Validates that the resolved database path is accessible
     */
    public boolean validateDatabasePath() {
        final String dbPath = resolveDatabasePath();
        final File dbFile = new File(dbPath);
        
        // Check if file exists
        if (!dbFile.exists()) {
            log.warn("⚠️ Database file does not exist: {}", dbPath);
            return false;
        }
        
        // Check if file is readable
        if (!dbFile.canRead()) {
            log.error("❌ Database file is not readable: {}", dbPath);
            return false;
        }
        
        // Check if file is writable
        if (!dbFile.canWrite()) {
            log.error("❌ Database file is not writable: {}", dbPath);
            return false;
        }
        
        log.info("✅ Database file validation passed: {}", dbPath);
        return true;
    }
}
