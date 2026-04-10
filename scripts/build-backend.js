#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building backend JAR...');

try {
    const backendDir = path.join(__dirname, '..', 'idorendmaker-backend');
    process.chdir(backendDir);

    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log('⚡ Running Maven package...');

    const mvnwCommand = process.platform === 'win32' ? '.\\mvnw.cmd' : './mvnw';
    execSync(`${mvnwCommand} clean package -DskipTests`, {
        stdio: 'inherit',
        cwd: backendDir
    });

    console.log('✅ Backend compilation completed!');

    // Find the built JAR (version may change in pom.xml).
    const targetDir = path.join(backendDir, 'target');
    const jarCandidates = fs.readdirSync(targetDir).filter((f) =>
        f.startsWith('idorendmaker-backend-') && f.endsWith('.jar') && !f.endsWith('-sources.jar') && !f.endsWith('-javadoc.jar')
    );

    if (jarCandidates.length === 0) {
        throw new Error(`No backend JAR found in: ${targetDir}`);
    }
    if (jarCandidates.length > 1) {
        throw new Error(`Multiple backend JARs found in ${targetDir}: ${jarCandidates.join(', ')}`);
    }

    const sourceJar = path.join(targetDir, jarCandidates[0]);
    const resourcesDir = path.join(__dirname, '..', 'idorendmaker-desktop', 'resources');
    fs.mkdirSync(resourcesDir, { recursive: true });
    const targetJar = path.join(resourcesDir, 'idorendmaker-backend.jar');

    console.log(`📦 Copying ${jarCandidates[0]} → idorendmaker-backend.jar`);
    fs.copyFileSync(sourceJar, targetJar);

    console.log('✅ Backend JAR copied successfully!');

} catch (error) {
    console.error('❌ Backend build failed:', error.message);
    process.exit(1);
}
