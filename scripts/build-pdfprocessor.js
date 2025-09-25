#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

console.log('🔨 Building PDF processor JAR...');

try {
    // Change to pdfprocessor directory and run Maven
    const pdfprocessorDir = path.join(__dirname, '..', 'idorendmaker-pdfprocessor');
    process.chdir(pdfprocessorDir);

    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log('⚡ Running Maven package build...');

    // Execute Maven clean package
    execSync('mvn clean package', {
        stdio: 'inherit',
        cwd: pdfprocessorDir
    });

    console.log('✅ PDF processor compilation completed!');

    // Find the generated JAR file in target directory
    const targetDir = path.join(pdfprocessorDir, 'target');
    const jarFiles = fs.readdirSync(targetDir).filter(file =>
        file.startsWith('idorendmaker-pdfprocessor') &&
        file.endsWith('.jar') &&
        !file.includes('original')
    );

    if (jarFiles.length === 0) {
        throw new Error('No PDF processor JAR file found in target directory');
    }

    const sourceJar = path.join(targetDir, jarFiles[0]);
    const targetJar = path.join(__dirname, '..', 'idorendmaker-desktop', 'resources', 'idorendmaker-pdfprocessor.jar');

    console.log(`📦 Copying JAR from ${jarFiles[0]} to desktop resources...`);
    fs.copyFileSync(sourceJar, targetJar);

    console.log('✅ PDF processor JAR copied successfully!');

} catch (error) {
    console.error('❌ PDF processor build failed:', error.message);
    process.exit(1);
}