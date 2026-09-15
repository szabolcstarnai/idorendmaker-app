import { spawn, ChildProcess, execFile } from 'child_process';
import path from 'path';
import axios from 'axios';
import { promises as fs, constants } from 'fs';
import { app } from 'electron';
import * as net from 'net';
import { findDevJar } from '../../common/services/devJarResolver';

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

type LaunchMode = 'bundledJava' | 'systemJava';

export class PDFProcessorService {
  private process: ChildProcess | null = null;
  private port: number = 0;
  private isReady: boolean = false;
  private javaPath: string | null = null;
  private jarPath: string | null = null;
  private launchMode: LaunchMode | null = null;
  private baseUrl: string = '';

  constructor() {
    console.log('PDF processor initialization:');
    console.log('- Packaged app:', app.isPackaged);
    console.log('- Platform:', process.platform);
    console.log('- resourcesPath:', process.resourcesPath);
  }

  /**
   * Candidate paths for the jar in a packaged app, plus the dev-mode
   * `target/` directory to scan for a freshly `mvn package`-built one (see
   * `findDevJar` - a plain `idorendmaker-pdfprocessor.jar` dev candidate
   * never resolved, since Maven always names it with the version suffix).
   */
  private getJarCandidates() {
    const packaged = path.join(process.resourcesPath, 'idorendmaker-pdfprocessor.jar');
    const devDir = path.join(process.cwd(), '..', 'idorendmaker-pdfprocessor', 'target');
    return { packaged, devDir };
  }

  /**
   * Candidate bundled java in resources/jre
   */
  private getBundledJavaCandidate() {
    return process.platform === 'win32'
      ? path.join(process.resourcesPath, 'jre', 'bin', 'java.exe')
      : path.join(process.resourcesPath, 'jre', 'bin', 'java');
  }

  /**
 * Check if 'java' is available on PATH (and usable)
 */
private async findSystemJava(): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('java', ['-version'], { timeout: 2000 }, (err, stdout, stderr) => {
      if (err) {
        resolve(null);
      } else {
        // stderr usually has the version line
        const firstLine = (stderr || stdout || '').toString().split('\n')[0];
        if (firstLine.includes('version')) {
          resolve('java'); // just rely on PATH
        } else {
          resolve(null);
        }
      }
    });
  });
}

/**
 * Validate presence of jar + java (bundled or system).
 * Sets launchMode/javaPath/jarPath
 */
private async resolveRuntime(): Promise<void> {
  const { packaged, devDir } = this.getJarCandidates();

  // Prefer packaged JAR, else whatever's actually in the dev target dir
  try {
    await fs.access(packaged, constants.F_OK);
    this.jarPath = packaged;
  } catch {
    this.jarPath = await findDevJar(devDir, 'idorendmaker-pdfprocessor');
    if (!this.jarPath) {
      throw new Error(`PDF processor JAR not found. Looked at: ${packaged}, ${devDir}/idorendmaker-pdfprocessor*.jar`);
    }
  }

  // Try bundled JRE first
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

  // Fall back to PATH java (installer ensures it’s Java >= 23)
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
          if (port) resolve(port);
          else reject(new Error('Could not find available port'));
        });
      });
      server.on('error', reject);
    });
  }

  /**
   * Start the Java -jar process that runs the Spring Boot PDF processor
   */
  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      console.log('PDF processor already running');
      return;
    }

    // Resolve jar + java
    await this.resolveRuntime();

    // Find available port
    this.port = await this.findAvailablePort();
    this.baseUrl = `http://localhost:${this.port}`;

    console.log(`Starting PDF processor on port ${this.port} (mode=${this.launchMode})...`);

    return new Promise((resolve, reject) => {
      if (!this.javaPath || !this.jarPath) {
        reject(new Error('Runtime not resolved'));
        return;
      }

      // Build spawn args: java -Djava.awt.headless=true -jar <jar> --server.port=...
      const spawnCmd = this.javaPath;
      const spawnArgs = [
        '-Djava.awt.headless=true',
        '-jar',
        this.jarPath,
        `--server.port=${this.port}`,
        '--logging.level.org.springframework.web=INFO',
        '--logging.level.root=INFO'
      ];

      this.process = spawn(spawnCmd, spawnArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        windowsHide: true
      });

      let startupTimeout: NodeJS.Timeout;
      let outputBuffer = '';

      this.process.on('error', (error) => {
        console.error('PDF processor spawn error:', error);
        clearTimeout(startupTimeout);
        this.process = null;
        this.isReady = false;
        reject(new Error(`Failed to start PDF processor: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        console.log(`PDF processor exited with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.process = null;
      });

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const output = data.toString();
          outputBuffer += output;
          console.log('PDF processor stdout:', output.trim());

          if (output.includes('Started IdorendMakerPdfProcessorApplication') ||
              output.includes('Tomcat started on port') ||
              (output.includes('Started') && output.includes('Application'))) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('PDF processor ready');
            resolve();
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const errOut = data.toString();
          outputBuffer += errOut;
          console.log('PDF processor stderr:', errOut.trim());

          if (errOut.includes('Started IdorendMakerPdfProcessorApplication') ||
              errOut.includes('Tomcat started on port') ||
              (errOut.includes('Started') && errOut.includes('Application'))) {
            this.isReady = true;
            clearTimeout(startupTimeout);
            console.log('PDF processor ready (from stderr)');
            resolve();
          }
        });
      }

      // Startup timeout: adjust if needed
      startupTimeout = setTimeout(() => {
        if (!this.isReady) {
          console.log('PDF processor startup timeout - captured output:', outputBuffer);
          this.stop().catch(() => {});
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
    const pid = this.process.pid;

    return new Promise((resolve) => {
      const shutdownTimeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Force killing PDF processor...');
          this.forceKillProcess(pid);
        }
      }, 5000);

      this.process.on('exit', () => {
        clearTimeout(shutdownTimeout);
        this.process = null;
        this.isReady = false;
        console.log('PDF processor stopped');
        resolve();
      });

      // On Windows, SIGTERM doesn't kill Java processes reliably.
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
   * Check if the processor is ready to accept requests
   */
  async isProcessorReady(): Promise<boolean> {
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
      if (!await this.isProcessorReady()) {
        await this.start();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await fs.access(pdfFilePath);
      const pdfBuffer = await fs.readFile(pdfFilePath);

      const FormData = (await import('form-data')).default;
      const form = new FormData();
      form.append('file', pdfBuffer, {
        filename: path.basename(pdfFilePath),
        contentType: 'application/pdf'
      });

      console.log(`Processing PDF: ${path.basename(pdfFilePath)}`);

      const response = await axios.post(
        `${this.baseUrl}/versenyszam/extract`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
          timeout: 30000,
        }
      );

      if (response.status === 200) {
        console.log(`Successfully processed PDF, extracted ${response.data.length} entries`);
        return { success: true, data: response.data };
      } else {
        return { success: false, error: `Unexpected response status: ${response.status}` };
      }
    } catch (error) {
      console.error('PDF processing error:', error);

      if (axios.isAxiosError(error)) {
        if ((error as any).code === 'ECONNREFUSED') {
          return { success: false, error: 'A PDF feldolgozó szolgáltatás nem elérhető' };
        } else if (error.response?.status === 400) {
          return { success: false, error: 'Hibás PDF fájl vagy formátum' };
        } else if ((error as any).code === 'ENOENT') {
          return { success: false, error: 'PDF fájl nem található' };
        }
      }

      return { success: false, error: error instanceof Error ? error.message : 'Ismeretlen hiba történt' };
    }
  }

  getStatus() {
    return {
      isRunning: this.process !== null && !this.process.killed,
      isReady: this.isReady,
      port: this.port,
      pid: this.process?.pid,
      launchMode: this.launchMode,
      javaPath: this.javaPath,
      jarPath: this.jarPath
    };
  }
}

export const pdfProcessorService = new PDFProcessorService();
