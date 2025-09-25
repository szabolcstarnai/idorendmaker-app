#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('📦 Building desktop application and installer...');

try {
    const desktopDir = path.join(__dirname, '..', 'idorendmaker-desktop');

    // Step 1: Run npm run package
    console.log('⚡ Running npm run package...');
    execSync('npm run package', {
        stdio: 'inherit',
        cwd: desktopDir
    });

    console.log('✅ Desktop packaging completed!');

    // Step 2: Delete dist directory
    const distDir = path.join(desktopDir, 'dist');
    if (fs.existsSync(distDir)) {
        console.log('🗑️ Cleaning dist directory...');
        fs.removeSync(distDir);
        console.log('✅ Dist directory cleaned!');
    }

    // Step 3: Run electron-builder for Windows NSIS installer
    console.log('🔧 Building Windows installer with electron-builder...');
    execSync('npx electron-builder --win nsis', {
        stdio: 'inherit',
        cwd: desktopDir
    });

    console.log('✅ Desktop application and installer built successfully!');
    console.log('🎉 Build process completed! Check idorendmaker-desktop/dist for the installer.');

} catch (error) {
    console.error('❌ Desktop packaging failed:', error.message);
    process.exit(1);
}