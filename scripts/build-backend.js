#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🔨 Building backend native executable...');

try {
    // Change to backend directory and run Maven wrapper
    const backendDir = path.join(__dirname, '..', 'idorendmaker-backend');
    process.chdir(backendDir);

    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log('⚡ Running Maven native compilation (this may take several minutes)...');

    // Execute Maven wrapper with native compilation
    execSync('.\\mvnw clean -Pnative native:compile', {
        stdio: 'inherit',
        cwd: backendDir
    });

    console.log('✅ Backend compilation completed!');

    // Copy the executable to desktop resources
    const sourceExe = path.join(backendDir, 'target', 'idorendmaker-backend.exe');
    const targetExe = path.join(__dirname, '..', 'idorendmaker-desktop', 'resources', 'idorendmaker-backend.exe');

    if (!fs.existsSync(sourceExe)) {
        throw new Error(`Backend executable not found at: ${sourceExe}`);
    }

    console.log('📦 Copying backend executable to desktop resources...');
    fs.copyFileSync(sourceExe, targetExe);

    console.log('✅ Backend executable copied successfully!');

} catch (error) {
    console.error('❌ Backend build failed:', error.message);
    process.exit(1);
}