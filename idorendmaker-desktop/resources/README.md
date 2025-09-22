# Resources Directory

This directory contains files that will be bundled with the Electron application installer.

## Files that should be placed here before building:

1. **idorendmaker-backend.exe** - GraalVM compiled backend Spring Boot application
2. **idorendmaker-pdfprocessor.exe** - GraalVM compiled PDF processor Spring Boot application
3. **idorendmaker-production.db** - Pre-populated SQLite database for production (generated during build)

## Build Process

These files are automatically copied here during the build process:
- Executables are copied from their respective `target/` directories after GraalVM compilation
- Production database is generated from the development database with sample data

## Installer Behavior

During installation, these resources are bundled into the app and placed in:
- Executables: `process.resourcesPath` (Electron's app resources directory)
- Database: Gets copied to `%APPDATA%\idorendmaker\` on first app startup

## Build Requirements

Before running `npm run make`, ensure:
1. Backend executable exists: `../idorendmaker-backend/target/idorendmaker-backend.exe`
2. PDF processor executable exists: `../idorendmaker-pdfprocessor/target/idorendmaker-pdfprocessor.exe`
3. Development database exists for population script