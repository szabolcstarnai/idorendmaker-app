import { dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { spawn } from 'child_process';

export class VCRuntimeService {
    private static instance: VCRuntimeService;
    private vcRedistUrls = [
        'https://aka.ms/vs/17/release/vc_redist.x64.exe', // Primary Microsoft redirect
        'https://download.microsoft.com/download/1/6/5/165255E7-1014-4D0A-B094-B6A430A6BFFC/vc_redist.x64.exe' // Fallback direct URL
    ];
    
    public static getInstance(): VCRuntimeService {
        if (!VCRuntimeService.instance) {
            VCRuntimeService.instance = new VCRuntimeService();
        }
        return VCRuntimeService.instance;
    }

    public async checkAndInstallVCRuntime(): Promise<boolean> {
        try {
            // Check if VC++ Redistributable is already installed
            if (this.isVCRuntimeInstalled()) {
                console.log('VC++ Redistributable is already installed');
                return true;
            }

            console.log('VC++ Redistributable not found, prompting user...');
            
            // Show user dialog explaining the issue in Hungarian
            const response = await dialog.showMessageBox({
                type: 'warning',
                title: 'Hiányzó futásidejű komponensek',
                message: 'Szükséges futásidejű komponensek hiányoznak',
                detail: 'Az alkalmazás működéséhez szükséges a Microsoft Visual C++ Redistributable (2015-2022) telepítése.\n\n' +
                       'Szeretné automatikusan letölteni és telepíteni?\n\n' +
                       'Ez egy egyszeri telepítés, amely körülbelül 2-3 percet vesz igénybe.',
                buttons: ['Automatikus telepítés', 'Kézi telepítés', 'Mégse'],
                defaultId: 0,
                cancelId: 2
            });

            switch (response.response) {
                case 0: // Install Automatically
                    return await this.downloadAndInstallVCRedist();
                case 1: // Install Manually
                    await this.openManualInstallPage();
                    return false;
                case 2: // Cancel
                    return false;
                default:
                    return false;
            }
        } catch (error) {
            console.error('Error checking VC++ Redistributable:', error);
            await this.showErrorDialog(error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    private isVCRuntimeInstalled(): boolean {
        const windowsDir = process.env.WINDIR || 'C:\\Windows';
        const system32Dir = path.join(windowsDir, 'System32');
        
        // Check for the specific DLL that GraalVM native executables need
        const requiredDlls = [
            'vcruntime140_1.dll',
            'vcruntime140.dll',
            'msvcp140.dll'
        ];

        console.log(`Checking for VC++ Runtime DLLs in: ${system32Dir}`);
        
        for (const dll of requiredDlls) {
            const dllPath = path.join(system32Dir, dll);
            if (!fs.existsSync(dllPath)) {
                console.log(`Missing DLL: ${dllPath}`);
                return false;
            }
            console.log(`Found DLL: ${dllPath}`);
        }

        // Also check registry for proper installation
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process');
                // Check registry for VC++ 2015-2022 installation
                const command = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /v Installed';
                const result = execSync(command, { encoding: 'utf8' }).toString();
                if (result.includes('0x1')) {
                    console.log('VC++ Redistributable found in registry');
                    return true;
                }
            } catch (registryError) {
                console.log('Registry check failed, relying on DLL file check');
            }
        }

        return true; // If we got here, all DLLs exist
    }

    private async downloadAndInstallVCRedist(): Promise<boolean> {
        try {
            // Show initial progress dialog in Hungarian
            let progressWindow = dialog.showMessageBox({
                type: 'info',
                title: 'Futásidejű komponensek letöltése',
                message: 'Microsoft Visual C++ Redistributable letöltése...',
                detail: 'Kérem várjon, amíg a szükséges komponensek letöltésre kerülnek.',
                buttons: []
            });

            // Download the redistributable with fallback URLs
            const tempDir = require('os').tmpdir();
            const fileName = 'vc_redist.x64.exe';
            const filePath = path.join(tempDir, fileName);
            
            console.log(`Downloading VC++ Redistributable to: ${filePath}`);
            
            let downloadSuccess = false;
            let lastError: Error | null = null;
            
            // Try each URL until one works
            for (const [index, url] of this.vcRedistUrls.entries()) {
                try {
                    console.log(`Attempting download from URL ${index + 1}/${this.vcRedistUrls.length}: ${url}`);
                    await this.downloadFile(url, filePath);
                    downloadSuccess = true;
                    console.log(`Download successful from URL ${index + 1}`);
                    break;
                } catch (error) {
                    console.log(`Download failed from URL ${index + 1}:`, error);
                    lastError = error instanceof Error ? error : new Error(String(error));
                    
                    // Clean up any partial download before trying next URL
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    } catch (cleanupError) {
                        console.log('Could not clean up partial download:', cleanupError);
                    }
                }
            }
            
            if (!downloadSuccess) {
                throw lastError || new Error('All download URLs failed');
            }
            
            // Update progress dialog for installation phase
            this.showInstallationProgress();
            
            // Install the redistributable with progress updates
            console.log('Installing VC++ Redistributable...');
            const installResult = await this.installVCRedistWithProgress(filePath);
            
            // Clean up downloaded file
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupError) {
                console.log('Could not clean up downloaded file:', cleanupError);
            }

            if (installResult) {
                await dialog.showMessageBox({
                    type: 'info',
                    title: 'Telepítés befejeződött',
                    message: 'Futásidejű komponensek sikeresen telepítve',
                    detail: 'A Microsoft Visual C++ Redistributable telepítése megtörtént. Az alkalmazás most normálisan elindul.',
                    buttons: ['Rendben']
                });
                return true;
            } else {
                await dialog.showMessageBox({
                    type: 'error',
                    title: 'Telepítés sikertelen',
                    message: 'Futásidejű komponensek telepítése sikertelen',
                    detail: 'Az automatikus telepítés nem sikerült. Kérem telepítse kézzel a Microsoft Visual C++ Redistributable-t.',
                    buttons: ['Rendben']
                });
                await this.openManualInstallPage();
                return false;
            }
        } catch (error) {
            console.error('Error downloading/installing VC++ Redistributable:', error);
            await dialog.showMessageBox({
                type: 'error',
                title: 'Letöltés sikertelen',
                message: 'Futásidejű komponensek letöltése sikertelen',
                detail: 'A szükséges komponensek letöltése nem sikerült. Ellenőrizze az internetkapcsolatot, vagy telepítse kézzel.',
                buttons: ['Rendben']
            });
            await this.openManualInstallPage();
            return false;
        }
    }

    private async downloadFile(url: string, destination: string): Promise<void> {
        try {
            console.log(`Starting download from: ${url}`);
            console.log(`Destination: ${destination}`);
            
            // Create axios instance with proper configuration for Microsoft redirects
            const axiosInstance = axios.create({
                timeout: 120000, // 2 minutes timeout for large downloads
                maxRedirects: 10, // Handle Microsoft aka.ms redirects
                validateStatus: (status) => status < 400, // Accept redirects
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            console.log('Sending HTTP request...');
            const response = await axiosInstance.get(url);
            
            console.log(`HTTP Response: ${response.status} ${response.statusText}`);
            console.log(`Final URL after redirects: ${response.config.url}`);
            console.log(`Content-Length: ${response.headers['content-length'] || 'unknown'}`);
            
            // Create write stream
            const writer = fs.createWriteStream(destination);
            
            // Setup progress tracking
            const totalLength = parseInt(response.headers['content-length'] || '0');
            let downloadedLength = 0;
            
            response.data.on('data', (chunk: Buffer) => {
                downloadedLength += chunk.length;
                const progress = totalLength > 0 ? Math.round((downloadedLength / totalLength) * 100) : 0;
                console.log(`Download progress: ${progress}% (${downloadedLength}/${totalLength} bytes)`);
            });
            
            // Pipe response to file
            response.data.pipe(writer);
            
            // Wait for download to complete
            await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => {
                    console.log('Download completed successfully');
                    resolve();
                });
                
                writer.on('error', (error) => {
                    console.error('Write stream error:', error);
                    // Clean up incomplete file
                    try {
                        fs.unlinkSync(destination);
                    } catch (cleanupError) {
                        console.log('Could not clean up incomplete file:', cleanupError);
                    }
                    reject(error);
                });
                
                response.data.on('error', (error: Error) => {
                    console.error('Response stream error:', error);
                    writer.destroy();
                    reject(error);
                });
            });
            
            // Verify file was downloaded
            const stats = fs.statSync(destination);
            console.log(`Downloaded file size: ${stats.size} bytes`);
            
            if (stats.size === 0) {
                throw new Error('Downloaded file is empty');
            }
            
        } catch (error) {
            console.error('Download failed:', error);
            
            // Clean up any partial download
            try {
                if (fs.existsSync(destination)) {
                    fs.unlinkSync(destination);
                }
            } catch (cleanupError) {
                console.log('Could not clean up failed download:', cleanupError);
            }
            
            // Provide more detailed error information
            if (axios.isAxiosError(error)) {
                const axiosError = error;
                const errorDetails = [
                    `Status: ${axiosError.response?.status || 'No response'}`,
                    `Status Text: ${axiosError.response?.statusText || 'N/A'}`,
                    `URL: ${axiosError.config?.url || 'unknown'}`,
                    `Message: ${axiosError.message}`
                ].join('\n');
                
                throw new Error(`HTTP request failed:\n${errorDetails}`);
            } else {
                throw error;
            }
        }
    }

    private showInstallationProgress(): void {
        // Show installation progress dialog
        dialog.showMessageBox({
            type: 'info',
            title: 'Futásidejű komponensek telepítése',
            message: 'Microsoft Visual C++ Redistributable telepítése...',
            detail: 'Kérem várjon, amíg a telepítés befejeződik. Ez néhány percet vehet igénybe.',
            buttons: []
        });
    }

    private installVCRedistWithProgress(installerPath: string): Promise<boolean> {
        return new Promise((resolve) => {
            console.log(`Executing VC++ Redistributable installer: ${installerPath}`);
            
            let progressInterval: NodeJS.Timeout;
            let progressCounter = 0;
            
            // Show periodic progress updates
            const progressMessages = [
                'Komponensek ellenőrzése...',
                'Fájlok kicsomagolása...',
                'Registry bejegyzések létrehozása...',
                'Könyvtárak regisztrálása...',
                'Telepítés befejezése...'
            ];
            
            // // Update progress message every 10 seconds
            // progressInterval = setInterval(() => {
            //     if (progressCounter < progressMessages.length - 1) {
            //         progressCounter++;
            //     }
            //     console.log(`Installation progress: ${progressMessages[progressCounter]}`);
                
            //     // Show updated dialog
            //     dialog.showMessageBox({
            //         type: 'info',
            //         title: 'Futásidejű komponensek telepítése',
            //         message: progressMessages[progressCounter],
            //         detail: 'Kérem várjon, amíg a telepítés befejeződik...',
            //         buttons: []
            //     });
            // }, 10000); // Update every 10 seconds
            
            // Install with silent parameters
            const installer = spawn(installerPath, ['/install', /*'/quiet',*/ '/norestart'], {
                detached: false,
                stdio: 'inherit'
            });

            installer.on('close', (code) => {
                clearInterval(progressInterval);
                console.log(`VC++ Redistributable installer exited with code: ${code}`);
                
                // Return codes:
                // 0 = Success
                // 1638 = Already installed (newer or same version)
                // 3010 = Success but restart required
                if (code === 0 || code === 1638 || code === 3010) {
                    resolve(true);
                } else {
                    console.error(`Installation failed with code: ${code}`);
                    resolve(false);
                }
            });

            installer.on('error', (error) => {
                clearInterval(progressInterval);
                console.error('Failed to start VC++ Redistributable installer:', error);
                resolve(false);
            });
        });
    }

    private async openManualInstallPage(): Promise<void> {
        await shell.openExternal('https://learn.microsoft.com/en-US/cpp/windows/latest-supported-vc-redist');
    }

    private async showErrorDialog(message: string): Promise<void> {
        await dialog.showMessageBox({
            type: 'error',
            title: 'Futásidejű komponensek ellenőrzési hiba',
            message: 'Hiba a futásidejű komponensek ellenőrzésekor',
            detail: `Hiba történt a szükséges futásidejű komponensek ellenőrzése során:\n\n${message}`,
            buttons: ['Rendben']
        });
    }
}