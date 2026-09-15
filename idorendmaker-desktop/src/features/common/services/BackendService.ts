import { spawn, ChildProcess, execFile } from 'child_process';
import path from 'path';
import axios from 'axios';
import { promises as fs, constants } from 'fs';
import { app } from 'electron';
import * as net from 'net';
import { findDevJar } from './devJarResolver';

interface BackendHealthCheck {
  status: string;
  components?: {
    [key: string]: {
      status: string;
    };
  };
}

type LaunchMode = 'bundledJava' | 'systemJava';

export class BackendService {
  private process: ChildProcess | null = null;
  private port: number = 0;
  private isReady: boolean = false;
  private javaPath: string | null = null;
  private jarPath: string | null = null;
  private launchMode: LaunchMode | null = null;
  private baseUrl: string = '';

  constructor() {
    console.log('Backend service initialization:');
    console.log('- Packaged app:', app.isPackaged);
    console.log('- Platform:', process.platform);
    console.log('- resourcesPath:', process.resourcesPath);
  }

  /**
   * Candidate paths for the backend jar: the packaged resource, plus the
   * dev-mode `target/` directory to scan for a freshly `mvn package`-built
   * one (see `findDevJar` - a hardcoded versioned path here used to break
   * silently on every `pom.xml` version bump).
   */
  private getJarCandidates() {
    const packaged = path.join(process.resourcesPath, 'idorendmaker-backend.jar');
    const devDir = path.join(process.cwd(), '..', 'idorendmaker-backend', 'target');
    return { packaged, devDir };
  }

  /**
   * Candidate bundled java in resources/jre
   */
  private getBundledJavaCandidate(): string {
    return process.platform === 'win32'
      ? path.join(process.resourcesPath, 'jre', 'bin', 'java.exe')
      : path.join(process.resourcesPath, 'jre', 'bin', 'java');
  }

  /**
   * Check if 'java' is available on PATH.
   */
  private async findSystemJava(): Promise<string | null> {
    return new Promise((resolve) => {
      execFile('java', ['-version'], { timeout: 2000 }, (err, stdout, stderr) => {
        if (err) {
          resolve(null);
        } else {
          const firstLine = (stderr || stdout || '').toString().split('\n')[0];
          if (firstLine.includes('version')) {
            resolve('java');
          } else {
            resolve(null);
          }
        }
      });
    });
  }

  /**
   * Locate the backend jar and a Java runtime to run it with.
   */
  private async resolveRuntime(): Promise<void> {
    const { packaged, devDir } = this.getJarCandidates();

    try {
      await fs.access(packaged, constants.F_OK);
      this.jarPath = packaged;
    } catch {
      this.jarPath = await findDevJar(devDir, 'idorendmaker-backend');
    }
    if (!this.jarPath) {
      throw new Error(`Backend JAR not found. Looked at: ${packaged}, ${devDir}/idorendmaker-backend*.jar`);
    }
    console.log('Backend JAR:', this.jarPath);

    // Prefer bundled JRE (installer places it under resources/jre)
    const bundledCandidate = this.getBundledJavaCandidate();
    try {
      await fs.access(bundledCandidate, constants.F_OK);
      this.launchMode = 'bundledJava';
      this.javaPath = bundledCandidate;
      console.log('Using bundled JRE:', this.javaPath);
      return;
    } catch {
      // no bundled java
    }

    // Fall back to PATH java (installer ensures Java >= 23)
    const systemJava = await this.findSystemJava();
    if (systemJava) {
      this.launchMode = 'systemJava';
      this.javaPath = systemJava;
      console.log('Using system Java on PATH');
      return;
    }

    throw new Error('No Java runtime found (neither bundled nor on PATH).');
  }

  /**
   * Find an available port for the Spring Boot application
   */
  private async findAvailablePort(): Promise<number> {
    const netMod = await import('net');

    return new Promise((resolve, reject) => {
      const server = netMod.createServer();
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
   * Start the Spring Boot backend process (java -jar).
   */
  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      console.log('Backend service already running');
      return;
    }

    await this.resolveRuntime();

    this.port = await this.findAvailablePort();
    this.baseUrl = `http://localhost:${this.port}`;

    console.log(`Starting backend service on port ${this.port} (mode=${this.launchMode})...`);

    return new Promise((resolve, reject) => {
      if (!this.javaPath || !this.jarPath) {
        reject(new Error('Runtime not resolved'));
        return;
      }

      const spawnArgs = [
        '-Djava.awt.headless=true',
        '-jar',
        this.jarPath,
        `--server.port=${this.port}`,
        '--logging.level.org.springframework.web=INFO',
        '--logging.level.root=INFO',
        ...(app.isPackaged ? ['--spring.profiles.active=prod'] : []),
      ];

      this.process = spawn(this.javaPath, spawnArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true,
      });

      let startupTimeout: NodeJS.Timeout;
      let outputBuffer = '';

      this.process.on('error', (error) => {
        console.error('Backend service error:', error);
        clearTimeout(startupTimeout);
        this.process = null;
        this.isReady = false;
        reject(new Error(`Failed to start backend service: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Backend service exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.process = null;
      });

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const output = data.toString();
          outputBuffer += output;
          console.log('Backend service stdout:', output.trim());

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
          outputBuffer += errorOutput;
          console.log('Backend service stderr:', errorOutput.trim());

          if (errorOutput.includes('Started IdorendMakerApplication') ||
              errorOutput.includes('Tomcat started on port')) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('Backend service ready (from stderr)');
            resolve();
          }
        });
      }

      // JVM cold start + Spring Boot needs more headroom than the old native image.
      startupTimeout = setTimeout(() => {
        if (!this.isReady) {
          console.log('Backend service startup timeout - captured output:', outputBuffer);
          this.stop().catch(() => {});
          reject(new Error('Backend service startup timeout (45 seconds)'));
        }
      }, 45000);
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
    const pid = this.process.pid;

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const shutdownTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing backend service...');
          this.forceKillProcess(pid);
        }
      }, 5000);

      this.process.on('exit', () => {
        clearTimeout(shutdownTimeout);
        this.process = null;
        this.isReady = false;
        console.log('Backend service stopped');
        resolve();
      });

      // On Windows, SIGTERM doesn't kill Java processes reliably.
      // Use taskkill to terminate the entire process tree.
      if (process.platform === 'win32' && pid) {
        this.forceKillProcess(pid);
      } else {
        this.process.kill('SIGTERM');
      }
    });
  }

  private forceKillProcess(pid: number | undefined): void {
    if (!pid) return;
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/T', '/PID', pid.toString()], {
          stdio: 'ignore',
          windowsHide: true,
        });
      } else {
        this.process?.kill('SIGKILL');
      }
    } catch (e) {
      console.error('Error killing process:', e);
    }
  }

  /**
   * Check if the backend service is ready to accept requests
   */
  async isServiceReady(): Promise<boolean> {
    if (!this.isReady || !this.process || this.process.killed) {
      return false;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/actuator/health`, {
        timeout: 2000
      });
      return response.status === 200;
    } catch (error) {
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
    return `${this.baseUrl}/api`;
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
      pid: this.process?.pid,
      launchMode: this.launchMode,
      javaPath: this.javaPath,
      jarPath: this.jarPath,
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
