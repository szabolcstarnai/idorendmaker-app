import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import axios from 'axios';
import { promises as fs, constants } from 'fs';
import { app } from 'electron';
import * as net from 'net';

interface BackendHealthCheck {
  status: string;
  components?: {
    [key: string]: {
      status: string;
    };
  };
}

export class BackendService {
  private process: ChildProcess | null = null;
  private port: number = 0;
  private isReady: boolean = false;
  private readonly executablePath: string;
  private baseUrl: string;

  constructor() {
    // Determine executable path based on environment
    this.executablePath = this.resolveExecutablePath();
    this.baseUrl = '';

    console.log('Backend service initialization:');
    console.log('- Packaged app:', app.isPackaged);
    console.log('- Platform:', process.platform);
    console.log('- Executable path:', this.executablePath);
  }

  /**
   * Resolve the path to the GraalVM backend executable
   */
  private resolveExecutablePath(): string {
    const executableName = this.getExecutableName();

    if (app.isPackaged) {
      // Production: executable bundled in app resources
      return path.join(process.resourcesPath, executableName);
    } else {
      // Development: relative path to source tree
      return path.join(process.cwd(), '../idorendmaker-backend/target', executableName);
    }
  }

  /**
   * Get platform-specific executable name
   */
  private getExecutableName(): string {
    switch (process.platform) {
      case 'win32':
        return 'idorendmaker-backend.exe';
      case 'darwin':
        return 'idorendmaker-backend-mac';
      case 'linux':
        return 'idorendmaker-backend-linux';
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
      console.log('✅ Backend executable found:', this.executablePath);

      // On Unix systems, ensure executable permissions
      if (process.platform !== 'win32') {
        try {
          await fs.access(this.executablePath, constants.X_OK);
          console.log('✅ Backend executable permissions verified');
        } catch (error) {
          console.log('🔧 Setting executable permissions...');
          await fs.chmod(this.executablePath, 0o755);
          console.log('✅ Backend executable permissions set');
        }
      }
    } catch (error) {
      const errorMessage = `Backend executable not found or not accessible: ${this.executablePath}`;
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
   * Start the GraalVM Spring Boot backend process
   */
  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      console.log('Backend service already running');
      return;
    }

    // Validate executable before attempting to start
    await this.validateExecutable();

    // Find available port
    this.port = await this.findAvailablePort();
    this.baseUrl = `http://localhost:${this.port}`;

    console.log(`Starting backend service on port ${this.port}...`);

    return new Promise((resolve, reject) => {
      // Spawn the GraalVM executable with port configuration
      this.process = spawn(this.executablePath, [
        `--server.port=${this.port}`,
        '--logging.level.org.springframework.web=INFO',
        '--logging.level.root=INFO',
        '--spring.datasource.url=jdbc:sqlite:idorendmaker.db'
      ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true
      });

      let startupTimeout: NodeJS.Timeout;

      // Handle process events
      this.process.on('error', (error) => {
        console.error('Backend service error:', error);
        clearTimeout(startupTimeout);
        reject(new Error(`Failed to start backend service: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Backend service exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.process = null;
      });

      // Capture output to detect when Spring Boot is ready
      let outputBuffer = '';

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const output = data.toString();
          outputBuffer += output;
          console.log('Backend service stdout:', output.trim());

          // Check if Spring Boot has started successfully
          if (output.includes('Started IdorendMakerApplication') ||
              output.includes('Tomcat started on port')) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('Backend service ready');
            resolve();
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          console.log('Backend service stderr:', errorOutput.trim());

          // Also check stderr for startup messages (some Spring Boot logs go to stderr)
          if (errorOutput.includes('Started IdorendMakerApplication') ||
              errorOutput.includes('Tomcat started on port')) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('Backend service ready (from stderr)');
            resolve();
          }
        });
      }

      // Set startup timeout (GraalVM should be very fast)
      startupTimeout = setTimeout(() => {
        if (!this.isReady) {
          console.log('Backend service startup timeout - captured output:', outputBuffer);
          this.stop();
          reject(new Error('Backend service startup timeout (30 seconds)'));
        }
      }, 30000);
    });
  }

  /**
   * Stop the backend service
   */
  async stop(): Promise<void> {
    if (!this.process || this.process.killed) {
      return;
    }

    console.log('Stopping backend service...');

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      // Give the process time to shutdown gracefully
      const shutdownTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing backend service...');
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process.on('exit', () => {
        clearTimeout(shutdownTimeout);
        this.process = null;
        this.isReady = false;
        console.log('Backend service stopped');
        resolve();
      });

      // Send termination signal
      this.process.kill('SIGTERM');
    });
  }

  /**
   * Check if the backend service is ready to accept requests
   */
  async isServiceReady(): Promise<boolean> {
    if (!this.isReady || !this.process || this.process.killed) {
      return false;
    }

    try {
      // Try to ping the Spring Boot actuator health endpoint
      const response = await axios.get(`${this.baseUrl}/actuator/health`, {
        timeout: 2000
      });
      return response.status === 200;
    } catch (error) {
      // If health endpoint doesn't exist, try base API endpoint
      try {
        await axios.get(`${this.baseUrl}/api`, {
          timeout: 2000
        });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get the current base URL for API calls
   */
  getBaseUrl(): string {
    return `http://localhost:8080/api`;
    //return `${this.baseUrl}/api`;
  }

  /**
   * Get the current port number
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get the current status of the backend service
   */
  getStatus() {
    return {
      isRunning: this.process !== null && !this.process.killed,
      isReady: this.isReady,
      port: this.port,
      baseUrl: this.baseUrl,
      pid: this.process?.pid
    };
  }

  /**
   * Ensure the backend service is running and ready
   */
  async ensureReady(): Promise<void> {
    if (!await this.isServiceReady()) {
      await this.start();

      // Wait a bit more for the service to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Singleton instance
export const backendService = new BackendService();