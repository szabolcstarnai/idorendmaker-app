package hu.szabolcst.idorendmaker.service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DatabasePathResolver {


    @Value("${app.database.mode:development}")
    private String databaseMode;


    @Value("${app.database.development.relative-path:../idorendmaker-desktop/idorendmaker.db}")
    private String developmentRelativePath;


    @Value("${app.database.production.app-name:idorendmaker}")
    private String productionAppName;


    @Value("${app.database.production.filename:idorendmaker.db}")
    private String productionFilename;


    @Value("${app.database.override-path:#{null}}")
    private String overridePath;


    public String resolveDatabasePath() {
        if (this.overridePath != null && !this.overridePath.isEmpty()) {
            log.info("🔧 Using override database path: {}", this.overridePath);
            return this.overridePath;
        }

        if ("development".equals(this.databaseMode)) {
            return resolveDevelopmentPath();
        }

        return resolveProductionPath();
    }


    private String resolveDevelopmentPath() {
        final String currentDir = System.getProperty("user.dir");
        final Path currentPath = Paths.get(currentDir);

        log.info("🔧 Development database path resolution:");
        log.info("   Current directory: {}", currentDir);
        log.info("   Configured relative path: {}", this.developmentRelativePath);

        Path dbPath = Paths.get(currentDir, this.developmentRelativePath).normalize();
        String absolutePath = dbPath.toAbsolutePath().toString();

        if ((new File(absolutePath)).exists()) {
            log.info("✅ Database found at configured path: {}", absolutePath);
            return absolutePath;
        }

        log.info("🔍 Running from target directory, adjusting path...");

        final String adjustedRelativePath = "../" + this.developmentRelativePath;
        dbPath = Paths.get(currentDir, adjustedRelativePath).normalize();
        absolutePath = dbPath.toAbsolutePath().toString();

        log.info("   Adjusted relative path: {}", adjustedRelativePath);
        log.info("   Adjusted absolute path: {}", absolutePath);

        if (currentPath.endsWith("target") && (new File(absolutePath)).exists()) {
            log.info("✅ Database found at adjusted path: {}", absolutePath);
            return absolutePath;
        }

        final Path projectRoot = findProjectRoot(currentPath);

        dbPath = projectRoot.resolve("idorendmaker-desktop/idorendmaker.db");
        absolutePath = dbPath.toAbsolutePath().toString();
        log.info("   Alternative path (from project root): {}", absolutePath);

        if (new File(absolutePath).exists()) {
            log.info("✅ Database found at project root path: {}", absolutePath);
            return absolutePath;
        }

        dbPath = Paths.get(currentDir, this.developmentRelativePath).normalize();
        absolutePath = dbPath.toAbsolutePath().toString();
        log.warn("⚠️ Database not found, returning configured path: {}", absolutePath);

        return absolutePath;
    }


    private Path findProjectRoot(final Path startPath) {
        Path current = startPath;

        for (int i = 0; i < 5 &&
            current != null; i++) {

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


    private String resolveProductionPath() {
        final String userDataDir = getUserDataDirectory();
        final Path dbPath = Paths.get(userDataDir, this.productionFilename);
        final String absolutePath = dbPath.toAbsolutePath().toString();

        log.info("🏭 Production database path resolution:");
        log.info("   User data directory: {}", userDataDir);
        log.info("   Database filename: {}", this.productionFilename);
        log.info("   Resolved path: {}", absolutePath);
        log.info("   Database exists: {}", (new File(absolutePath)).exists());

        final File parentDir = new File(userDataDir);
        if (!parentDir.exists()) {
            log.info("📁 Creating user data directory: {}", userDataDir);
            parentDir.mkdirs();
        }

        return absolutePath;
    }


    private String getUserDataDirectory() {
        final String os = System.getProperty("os.name").toLowerCase();
        final String userHome = System.getProperty("user.home");

        if (os.contains("win")) {

            final String appData = System.getenv("APPDATA");
            return (appData != null) ?
                Paths.get(appData, this.productionAppName).toString() :
                Paths.get(userHome, "AppData", "Roaming", this.productionAppName).toString();
        }
        if (os.contains("mac")) {
            return Paths.get(userHome, "Library", "Application Support", this.productionAppName).toString();
        }

        return Paths.get(userHome, ".config", this.productionAppName).toString();
    }


    public boolean validateDatabasePath() {
        final String dbPath = resolveDatabasePath();
        final File dbFile = new File(dbPath);

        if (!dbFile.exists()) {
            log.warn("⚠️ Database file does not exist: {}", dbPath);
            return false;
        }

        if (!dbFile.canRead()) {
            log.error("❌ Database file is not readable: {}", dbPath);
            return false;
        }

        if (!dbFile.canWrite()) {
            log.error("❌ Database file is not writable: {}", dbPath);
            return false;
        }

        log.info("✅ Database file validation passed: {}", dbPath);
        return true;
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\DatabasePathResolver.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */