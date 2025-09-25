#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('📄 Managing licenses...');

try {
    const rootDir = path.join(__dirname, '..');

    // Step 1: Delete old license files
    console.log('🗑️ Cleaning up old license files...');

    const filesToDelete = [
        'licenses/idorendmaker-backend/licenses.xml',
        'licenses/idorendmaker-pdfprocessor/licenses.xml',
        'licenses/idorendmaker-desktop/licenses.json',
        'licenses/idorendmaker-desktop/ALL-THIRD-PARTY-LICENSES.html',
        'THIRD-PARTY-LICENSES.md'
    ];

    filesToDelete.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`   ✅ Deleted: ${file}`);
        }
    });

    // Step 2: Run Maven license downloads for both projects
    console.log('📥 Downloading licenses from Maven projects...');

    const mavenProjects = ['idorendmaker-backend', 'idorendmaker-pdfprocessor'];

    mavenProjects.forEach(projectName => {
        console.log(`   🔄 Processing ${projectName}...`);
        const projectDir = path.join(rootDir, projectName);

        execSync('mvn license:download-licenses', {
            stdio: 'inherit',
            cwd: projectDir
        });
    });

    // Step 3: Run license-checker for desktop project
    console.log('📋 Running license-checker for desktop project...');
    const desktopDir = path.join(rootDir, 'idorendmaker-desktop');

    console.log('   🔄 Processing idorendmaker-desktop...');
    execSync('license-checker --json > licenses.json', {
        stdio: 'inherit',
        cwd: desktopDir
    });

    // Step 4: Copy license files from projects to root licenses/
    console.log('📋 Copying license files to root licenses directory...');

    mavenProjects.forEach(projectName => {
        const projectDir = path.join(rootDir, projectName);
        const sourceLicensesDir = path.join(projectDir, 'target', 'generated-resources', 'licenses');
        const targetLicensesDir = path.join(rootDir, 'licenses');

        // Copy all files from project's licenses directory to root licenses/
        if (fs.existsSync(sourceLicensesDir)) {
            const files = fs.readdirSync(sourceLicensesDir);
            files.forEach(file => {
                if (file !== 'licenses.xml') { // Skip licenses.xml for now
                    fs.copyFileSync(
                        path.join(sourceLicensesDir, file),
                        path.join(targetLicensesDir, file)
                    );
                }
            });
            console.log(`   ✅ Copied license files from ${projectName}`);
        }

        // Copy licenses.xml to project-specific directory
        const sourceLicensesXml = path.join(projectDir, 'target', 'generated-resources', 'licenses.xml');
        const targetProjectDir = path.join(rootDir, 'licenses', projectName);

        if (fs.existsSync(sourceLicensesXml)) {
            fs.ensureDirSync(targetProjectDir);
            fs.copyFileSync(
                sourceLicensesXml,
                path.join(targetProjectDir, 'licenses.xml')
            );
            console.log(`   ✅ Copied licenses.xml for ${projectName}`);
        }
    });

    // Copy desktop licenses.json to project-specific directory
    const desktopLicensesJson = path.join(desktopDir, 'licenses.json');
    const desktopProjectDir = path.join(rootDir, 'licenses', 'idorendmaker-desktop');

    if (fs.existsSync(desktopLicensesJson)) {
        fs.ensureDirSync(desktopProjectDir);
        fs.copyFileSync(
            desktopLicensesJson,
            path.join(desktopProjectDir, 'licenses.json')
        );
        console.log('   ✅ Copied licenses.json for idorendmaker-desktop');
    }

    // Step 5: Run Python license summary script
    console.log('🐍 Running Python license summary generator...');
    const scriptsDir = path.join(rootDir, 'idorendmaker-scripts');
    const pythonScript = path.join(scriptsDir, 'license-summary.py');

    execSync(`python3 "${pythonScript}" "${rootDir}"`, {
        stdio: 'inherit',
        cwd: scriptsDir
    });

    // Step 6: Copy license bundle to desktop resources
    console.log('📦 Copying license bundle to desktop resources...');
    const desktopResourcesDir = path.join(rootDir, 'idorendmaker-desktop', 'resources');

    // Copy LICENSE file
    fs.copyFileSync(
        path.join(rootDir, 'LICENSE'),
        path.join(desktopResourcesDir, 'LICENSE')
    );

    // Copy THIRD-PARTY-LICENSES.md
    fs.copyFileSync(
        path.join(rootDir, 'THIRD-PARTY-LICENSES.md'),
        path.join(desktopResourcesDir, 'THIRD-PARTY-LICENSES.md')
    );

    // Copy entire licenses directory
    const sourceLicensesDir = path.join(rootDir, 'licenses');
    const targetLicensesDir = path.join(desktopResourcesDir, 'licenses');

    fs.removeSync(targetLicensesDir); // Remove existing
    fs.copySync(sourceLicensesDir, targetLicensesDir);

    console.log('✅ License management completed successfully!');

} catch (error) {
    console.error('❌ License management failed:', error.message);
    process.exit(1);
}