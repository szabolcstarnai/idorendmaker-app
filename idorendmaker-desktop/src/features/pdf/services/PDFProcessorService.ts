import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import axios from 'axios';
import { promises as fs, constants } from 'fs';
import { app } from 'electron';
import * as net from 'net';

interface ProcessedVersenyszam {
  nev: string;
  munem: string;
  hajoosztaly: string;
  nem: string;
  korosztaly: string;
  tav: string;
  [key: string]: any;
}

interface PDFProcessorResult {
  success: boolean;
  data?: ProcessedVersenyszam[];
  error?: string;
}

export class PDFProcessorService {
  private process: ChildProcess | null = null;
  private port: number = 0;
  private isReady: boolean = false;
  private readonly executablePath: string;
  private baseUrl: string;

  constructor() {
    // Determine executable path based on environment
    this.executablePath = this.resolveExecutablePath();
    this.baseUrl = '';
    
    console.log('PDF processor initialization:');
    console.log('- Packaged app:', app.isPackaged);
    console.log('- Platform:', process.platform);
    console.log('- Executable path:', this.executablePath);
  }

  /**
   * Resolve the path to the GraalVM executable
   */
  private resolveExecutablePath(): string {
    const executableName = this.getExecutableName();
    
    if (app.isPackaged) {
      // Production: executable bundled in app resources
      return path.join(process.resourcesPath, executableName);
    } else {
      // Development: relative path to source tree
      return path.join(process.cwd(), '../idorendmaker-pdfprocessor/target', executableName);
    }
  }

  /**
   * Get platform-specific executable name
   */
  private getExecutableName(): string {
    switch (process.platform) {
      case 'win32':
        return 'idorendmaker-pdfprocessor.exe';
      case 'darwin':
        return 'idorendmaker-pdfprocessor-mac';
      case 'linux':
        return 'idorendmaker-pdfprocessor-linux';
      default:
        throw new Error(`Unsupported platform: ${process.platform}`);
    }
  }

  /**
   * Validate that the executable exists and is accessible
   */
  private async validateExecutable(): Promise<void> {
    try {
      // Check if file exists
      await fs.access(this.executablePath, constants.F_OK);
      console.log('✅ Executable found:', this.executablePath);
      
      // On Unix systems, ensure executable permissions
      if (process.platform !== 'win32') {
        try {
          await fs.access(this.executablePath, constants.X_OK);
          console.log('✅ Executable permissions verified');
        } catch (error) {
          console.log('🔧 Setting executable permissions...');
          await fs.chmod(this.executablePath, 0o755);
          console.log('✅ Executable permissions set');
        }
      }
    } catch (error) {
      const errorMessage = `PDF processor executable not found or not accessible: ${this.executablePath}`;
      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Find an available port for the Spring Boot application
   */
  private async findAvailablePort(): Promise<number> {
    const net = await import('net');
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, () => {
        const port = (server.address() as net.AddressInfo)?.port;
        server.close(() => {
          if (port) {
            resolve(port);
          } else {
            reject(new Error('Could not find available port'));
          }
        });
      });
      server.on('error', reject);
    });
  }

  /**
   * Start the GraalVM Spring Boot process
   */
  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      console.log('PDF processor already running');
      return;
    }

    // Validate executable before attempting to start
    await this.validateExecutable();

    // Find available port
    this.port = await this.findAvailablePort();
    this.baseUrl = `http://localhost:${this.port}`;

    console.log(`Starting PDF processor on port ${this.port}...`);

    return new Promise((resolve, reject) => {
      // Spawn the GraalVM executable with port configuration
      this.process = spawn(this.executablePath, [
        `--server.port=${this.port}`,
        '--logging.level.org.springframework.web=INFO',
        '--logging.level.root=INFO'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true
      });

      let startupTimeout: NodeJS.Timeout;
      
      // Handle process events
      this.process.on('error', (error) => {
        console.error('PDF processor error:', error);
        clearTimeout(startupTimeout);
        reject(new Error(`Failed to start PDF processor: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        console.log(`PDF processor exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.process = null;
      });

      // Capture output to detect when Spring Boot is ready
      let outputBuffer = '';
      
      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const output = data.toString();
          outputBuffer += output;
          console.log('PDF processor stdout:', output.trim());
          
          // Check if Spring Boot has started successfully
          if (output.includes('Started IdorendHelperApplication') || 
              output.includes('Tomcat started on port')) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('PDF processor ready');
            resolve();
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          console.log('PDF processor stderr:', errorOutput.trim());
          
          // Also check stderr for startup messages (some Spring Boot logs go to stderr)
          if (errorOutput.includes('Started IdorendHelperApplication') || 
              errorOutput.includes('Tomcat started on port')) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('PDF processor ready (from stderr)');
            resolve();
          }
        });
      }

      // Set startup timeout (GraalVM should be very fast)
      startupTimeout = setTimeout(() => {
        if (!this.isReady) {
          console.log('PDF processor startup timeout - captured output:', outputBuffer);
          this.stop();
          reject(new Error('PDF processor startup timeout (20 seconds)'));
        }
      }, 20000);
    });
  }

  /**
   * Stop the PDF processor
   */
  async stop(): Promise<void> {
    if (!this.process || this.process.killed) {
      return;
    }

    console.log('Stopping PDF processor...');
    
    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      // Give the process time to shutdown gracefully
      const shutdownTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing PDF processor...');
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process.on('exit', () => {
        clearTimeout(shutdownTimeout);
        this.process = null;
        this.isReady = false;
        console.log('PDF processor stopped');
        resolve();
      });

      // Send termination signal
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Check if the processor is ready to accept requests
   */
  async isProcessorReady(): Promise<boolean> {
    if (!this.isReady || !this.process || this.process.killed) {
      return false;
    }

    try {
      // Try to ping the Spring Boot actuator endpoint or base endpoint
      const response = await axios.get(`${this.baseUrl}/actuator/health`, {
        timeout: 2000
      });
      return response.status === 200;
    } catch (error) {
      // If health endpoint doesn't exist, try base endpoint
      try {
        await axios.get(`${this.baseUrl}`, {
          timeout: 2000
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Process a PDF file and extract competition data
   */
  async processPDF(pdfFilePath: string): Promise<PDFProcessorResult> {
    try {
      // Ensure the processor is running
      if (!await this.isProcessorReady()) {
        await this.start();
        
        // Wait a bit more for the service to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Check if file exists
      await fs.access(pdfFilePath);

      // Read PDF file
      const pdfBuffer = await fs.readFile(pdfFilePath);
      
      // Create FormData for multipart upload
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', pdfBuffer, {
        filename: path.basename(pdfFilePath),
        contentType: 'application/pdf'
      });

      console.log(`Processing PDF: ${path.basename(pdfFilePath)}`);

      // Send request to Spring Boot endpoint
      const response = await axios.post(
        `${this.baseUrl}/versenyszam/extract`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000, // 30 second timeout for PDF processing
        }
      );

      if (response.status === 200) {
        console.log(`Successfully processed PDF, extracted ${response.data.length} competition entries`);
        return {
          success: true,
          data: response.data
        };
      } else {
        return {
          success: false,
          error: `Unexpected response status: ${response.status}`
        };
      }
    } catch (error) {
      console.error('PDF processing error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            error: 'A PDF feldolgozó szolgáltatás nem elérhető'
          };
        } else if (error.response?.status === 400) {
          return {
            success: false,
            error: 'Hibás PDF fájl vagy formátum'
          };
        } else if (error.code === 'ENOENT') {
          return {
            success: false,
            error: 'PDF fájl nem található'
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt'
      };
    }
  }

  /**
   * Get the current status of the processor
   */
  getStatus() {
    return {
      isRunning: this.process !== null && !this.process.killed,
      isReady: this.isReady,
      port: this.port,
      pid: this.process?.pid
    };
  }
}

// Singleton instance
export const pdfProcessorService = new PDFProcessorService();