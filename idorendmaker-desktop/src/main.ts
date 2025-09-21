import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { promises as fs } from 'fs';
import started from 'electron-squirrel-startup';
// import { RaceService } from './data/services/RaceService'; // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
// import { ScheduleService } from './data/services/ScheduleService'; // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
// import { RuleService } from './data/services/RuleService'; // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
// import { LevelService } from './data/services/LevelService'; // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
import { BackendAPIService } from './data/services/BackendAPIService';
import { ConflictDetector } from './features/rules/utils/ruleEngine';
// import { closePrismaClient } from './data/services/prisma'; // REMOVED FOR PRISMA ELIMINATION - Backend handles database cleanup
import { CreateRuleData, ScheduleRace } from '../shared/types/race';
import { ExportService } from './features/common/services/ExportService';
// PDF processor imports moved to main process
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import axios from 'axios';
import { backendService } from './features/common/services/BackendService';
// import { RaceMatchingService } from './features/pdf/services/RaceMatchingService'; // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
// import { CompetitorService } from '../archive/CompetitorService.ts.old';
import { DatabaseInitializer } from './features/common/services/DatabaseInitializer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// PDF Processor State Management (moved from renderer service)
let pdfProcessorProcess: ChildProcess | null = null;
let pdfProcessorPort: number = 0;
let pdfProcessorReady: boolean = false;
let pdfProcessorBaseUrl: string = '';

// PDF Processor Utility Functions
const getExecutableName = (): string => {
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
};

const resolveExecutablePath = (isPackaged: boolean, resourcesPath: string): string => {
  const executableName = getExecutableName();

  if (isPackaged) {
    // Production: executable bundled in app resources
    return path.join(resourcesPath, executableName);
  } else {
    // Development: relative path to source tree
    return path.join(process.cwd(), '../idorendmaker-pdfprocessor/target', executableName);
  }
};

const validateExecutable = async (executablePath: string): Promise<void> => {
  try {
    // Check if file exists
    await fs.access(executablePath);
    console.log('✅ Executable found:', executablePath);

    // On Unix systems, ensure executable permissions
    if (process.platform !== 'win32') {
      try {
        await fs.access(executablePath, fs.constants.X_OK);
        console.log('✅ Executable permissions verified');
      } catch (error) {
        console.log('🔧 Setting executable permissions...');
        await fs.chmod(executablePath, 0o755);
        console.log('✅ Executable permissions set');
      }
    }
  } catch (error) {
    const errorMessage = `PDF processor executable not found or not accessible: ${executablePath}`;
    console.error('❌', errorMessage);
    throw new Error(errorMessage);
  }
};

const findAvailablePort = (): Promise<number> => {
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
};

const startPDFProcessor = async (): Promise<void> => {
  if (pdfProcessorProcess && !pdfProcessorProcess.killed) {
    console.log('PDF processor already running');
    return;
  }

  // Get executable path
  const executablePath = resolveExecutablePath(app.isPackaged, process.resourcesPath || '');

  // Validate executable before attempting to start
  await validateExecutable(executablePath);

  // Find available port
  pdfProcessorPort = await findAvailablePort();
  pdfProcessorBaseUrl = `http://localhost:8081`; // Use fixed port for now

  console.log(`Starting PDF processor on port ${pdfProcessorPort}...`);

  return new Promise((resolve, reject) => {
    // Spawn the GraalVM executable with port configuration
    pdfProcessorProcess = spawn(executablePath, [
      `--server.port=${pdfProcessorPort}`,
      '--logging.level.org.springframework.web=INFO',
      '--logging.level.root=INFO'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      windowsHide: true
    });

    let startupTimeout: NodeJS.Timeout;

    // Handle process events
    pdfProcessorProcess.on('error', (error) => {
      console.error('PDF processor error:', error);
      clearTimeout(startupTimeout);
      reject(new Error(`Failed to start PDF processor: ${error.message}`));
    });

    pdfProcessorProcess.on('exit', (code, signal) => {
      console.log(`PDF processor exited with code ${code}, signal ${signal}`);
      pdfProcessorReady = false;
      pdfProcessorProcess = null;
    });

    // Capture output to detect when Spring Boot is ready
    let outputBuffer = '';

    if (pdfProcessorProcess.stdout) {
      pdfProcessorProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        console.log('PDF processor stdout:', output.trim());

        // Check if Spring Boot has started successfully
        if (output.includes('Started IdorendHelperApplication') ||
            output.includes('Tomcat started on port')) {
          pdfProcessorReady = true;
          clearTimeout(startupTimeout);
          console.log('PDF processor ready');
          resolve();
        }
      });
    }

    if (pdfProcessorProcess.stderr) {
      pdfProcessorProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.log('PDF processor stderr:', errorOutput.trim());

        // Also check stderr for startup messages (some Spring Boot logs go to stderr)
        if (errorOutput.includes('Started IdorendHelperApplication') ||
            errorOutput.includes('Tomcat started on port')) {
          pdfProcessorReady = true;
          clearTimeout(startupTimeout);
          console.log('PDF processor ready (from stderr)');
          resolve();
        }
      });
    }

    // Set startup timeout (GraalVM should be very fast)
    startupTimeout = setTimeout(() => {
      if (!pdfProcessorReady) {
        console.log('PDF processor startup timeout - captured output:', outputBuffer);
        stopPDFProcessor();
        reject(new Error('PDF processor startup timeout (20 seconds)'));
      }
    }, 20000);
  });
};

const stopPDFProcessor = async (): Promise<void> => {
  if (!pdfProcessorProcess || pdfProcessorProcess.killed) {
    return;
  }

  console.log('Stopping PDF processor...');

  return new Promise((resolve) => {
    if (!pdfProcessorProcess) {
      resolve();
      return;
    }

    // Give the process time to shutdown gracefully
    const shutdownTimeout = setTimeout(() => {
      if (pdfProcessorProcess && !pdfProcessorProcess.killed) {
        console.log('Force killing PDF processor...');
        pdfProcessorProcess.kill('SIGKILL');
      }
    }, 5000);

    pdfProcessorProcess.on('exit', () => {
      clearTimeout(shutdownTimeout);
      pdfProcessorProcess = null;
      pdfProcessorReady = false;
      console.log('PDF processor stopped');
      resolve();
    });

    // Send termination signal
    pdfProcessorProcess.kill('SIGTERM');
  });
};

const isPDFProcessorReady = async (): Promise<boolean> => {
  if (!pdfProcessorReady || !pdfProcessorProcess || pdfProcessorProcess.killed) {
    return false;
  }

  try {
    // Try to ping the Spring Boot actuator endpoint or base endpoint
    const response = await axios.get(`${pdfProcessorBaseUrl}/actuator/health`, {
      timeout: 2000
    });
    return response.status === 200;
  } catch (error) {
    // If health endpoint doesn't exist, try base endpoint
    try {
      await axios.get(`${pdfProcessorBaseUrl}`, {
        timeout: 2000
      });
      return true;
    } catch {
      return false;
    }
  }
};

const processPDFFile = async (pdfFilePath: string): Promise<any> => {
  try {
    // Ensure the processor is running
    if (!await isPDFProcessorReady()) {
      await startPDFProcessor();

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
      `${pdfProcessorBaseUrl}/versenyszam/extract`,
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
      // Handle connection errors
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'A PDF feldolgozó szolgáltatás nem elérhető'
        };
      }

      // Handle file system errors
      if (error.code === 'ENOENT') {
        return {
          success: false,
          error: 'PDF fájl nem található'
        };
      }

      // Handle HTTP error responses with structured error data
      if (error.response && error.response.data) {
        const responseData = error.response.data;

        // Check if this is a structured error response from our backend
        if (responseData &&
            typeof responseData === 'object' &&
            'errorCode' in responseData &&
            'userMessage' in responseData) {
          console.log('Received structured error response:', responseData);
          return {
            success: false,
            error: responseData.userMessage,
            errorCode: responseData.errorCode,
            userMessage: responseData.userMessage
          };
        }
      }

      // Handle HTTP status codes with fallback messages
      const status = error.response?.status;
      if (status === 400) {
        return {
          success: false,
          error: 'Csak PDF fájlokat lehet feldolgozni.',
          errorCode: 'INVALID_FILE_TYPE'
        };
      } else if (status === 422) {
        return {
          success: false,
          error: 'A PDF nem tartalmazza a várt MKKSZ formátum szerkezetét.',
          errorCode: 'INVALID_CONTENT_ERROR'
        };
      } else if (status === 500) {
        return {
          success: false,
          error: 'Hiba történt a PDF feldolgozása során.',
          errorCode: 'PROCESSING_ERROR'
        };
      }
    }

    // Handle other types of errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ismeretlen hiba történt'
    };
  }
};

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Initialize database and IPC handlers
const initializeApp = async () => {
  try {
    // Start backend service first - this is critical for all database operations
    console.log('🚀 Starting backend service...');
    await backendService.start();
    console.log('✅ Backend service started successfully');
    console.log(`📍 Backend URL: ${backendService.getBaseUrl()}`);

    // Initialize database based on environment (development vs production)
    console.log('🔧 Initializing database system...');
    const dbConfig = await DatabaseInitializer.initialize();
    console.log(`✅ Database initialized: ${dbConfig.path}`);
    console.log(`📍 Environment: ${dbConfig.isProduction ? 'Production' : 'Development'}`);
    
    if (dbConfig.wasInitialized) {
      console.log('🎉 First-time setup completed successfully');
    }
    
    // Validate database accessibility
    const isValid = await DatabaseInitializer.validateDatabase(dbConfig.path);
    if (!isValid) {
      console.error('❌ Database validation failed - some features may not work properly');
    }
    
  } catch (error) {
    console.error('❌ Backend service or database initialization failed:', error);
    // Continue with app startup even if backend/database init fails
    // This allows for debugging and error recovery
  }

  // IPC handlers for database operations using Prisma services
  // TODO: After Prisma migration, these will be replaced with HTTP client calls
  ipcMain.handle('db:getAllRaces', async () => {
    // return await RaceService.getAllRaces(); // OLD PRISMA VERSION
    return await BackendAPIService.getAllRaces(); // NEW BACKEND VERSION
  });
  
  ipcMain.handle('db:searchRaces', async (_, searchTerm: string) => {
    // return await RaceService.searchRaces(searchTerm); // OLD PRISMA VERSION
    return await BackendAPIService.searchRaces(searchTerm); // NEW BACKEND VERSION
  });
  
  ipcMain.handle('db:getAllAgeGroups', async () => {
    // return await RaceService.getAllAgeGroups(); // OLD PRISMA VERSION
    return await BackendAPIService.getAllAgeGroups(); // NEW BACKEND VERSION
  });
  
  // Level operations - MIGRATED TO BACKEND API
  ipcMain.handle('db:getAllLevels', async () => {
    // return await LevelService.getAllLevels(); // OLD PRISMA VERSION
    return await BackendAPIService.getAllLevels(); // NEW BACKEND VERSION
  });
  
  ipcMain.handle('db:getDefaultLevel', async () => {
    // return await LevelService.getDefaultLevel(); // OLD PRISMA VERSION  
    return await BackendAPIService.getDefaultLevel(); // NEW BACKEND VERSION
  });
  
  // Schedule operations - MIGRATED TO BACKEND API
  ipcMain.handle('db:getAllSchedules', async () => {
    // return await ScheduleService.getAllSchedules(); // OLD PRISMA VERSION
    return await BackendAPIService.getAllSchedules(); // NEW BACKEND VERSION
  });
  
  ipcMain.handle('db:getScheduleItems', async (_, scheduleId: number) => {
    // return await ScheduleService.getScheduleItems(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.getScheduleItems(scheduleId); // NEW BACKEND VERSION
  });
  
  // Rule operations
  ipcMain.handle('db:getAllRules', async () => {
    // return await RuleService.getAllRules(); // OLD PRISMA VERSION
    return await BackendAPIService.getAllRules(); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getActiveRules', async () => {
    // return await RuleService.getActiveRules(); // OLD PRISMA VERSION
    return await BackendAPIService.getActiveRules(); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getRuleById', async (_, id: number) => {
    // return await RuleService.getRuleById(id); // OLD PRISMA VERSION
    return await BackendAPIService.getRuleById(id); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:createRule', async (_, data: CreateRuleData) => {
    // return await RuleService.createRule(data); // OLD PRISMA VERSION
    return await BackendAPIService.createRule(data); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:updateRule', async (_, id: number, data: Partial<CreateRuleData>) => {
    // return await RuleService.updateRule(id, data); // OLD PRISMA VERSION
    return await BackendAPIService.updateRule(id, data); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:deleteRule', async (_, id: number) => {
    // return await RuleService.deleteRule(id); // OLD PRISMA VERSION
    return await BackendAPIService.deleteRule(id); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:toggleRuleActive', async (_, id: number, isActive: boolean) => {
    // return await RuleService.toggleRuleActive(id, isActive); // OLD PRISMA VERSION
    return await BackendAPIService.toggleRuleActive(id, isActive); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:searchRules', async (_, searchTerm: string) => {
    // return await RuleService.searchRules(searchTerm); // OLD PRISMA VERSION
    return await BackendAPIService.searchRules(searchTerm); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getRuleStats', async () => {
    // return await RuleService.getRuleStats(); // OLD PRISMA VERSION
    return await BackendAPIService.getRuleStats(); // NEW BACKEND VERSION
  });

  // Rule engine operations
  ipcMain.handle('db:checkScheduleViolations', async (_, scheduleRaces: ScheduleRace[], ruleIds?: number[]) => {
    const rules = ruleIds 
      ? await Promise.all(ruleIds.map(id => BackendAPIService.getRuleById(id)).filter(Boolean))
      : await BackendAPIService.getActiveRules();
    return await ConflictDetector.detectConflicts(scheduleRaces, rules);
  });

  // Enhanced rule checking with competitor awareness
  ipcMain.handle('db:checkScheduleViolationsWithCompetitors', async (_, scheduleRaces: ScheduleRace[], pdfExtractionId?: number, ruleIds?: number[]) => {
    try {
      const rules = ruleIds 
        ? await Promise.all(ruleIds.map(id => BackendAPIService.getRuleById(id)).filter(Boolean))
        : await BackendAPIService.getActiveRules();
      
      if (!pdfExtractionId) {
        return await ConflictDetector.detectConflicts(scheduleRaces, rules);
      }

      // Get traditional rule violations first
      const baseViolations = await ConflictDetector.detectConflicts(scheduleRaces, rules);
      
      // Enhance each violation with competitor information
      const enhancedViolations = await Promise.all(
        baseViolations.map(async (violation) => {
          try {
            // Check for competitor conflicts between the two races
            const competitorConflict = await BackendAPIService.checkCompetitorConflicts(
              violation.race1.id,
              violation.race2.id,
              pdfExtractionId
            );

            // Create enhanced violation with competitor context
            const enhancedViolation = {
              ...violation,
              competitorOverlap: competitorConflict.hasConflicts,
              conflictingCompetitors: competitorConflict.conflictingCompetitors,
              competitorCount: competitorConflict.competitorCount
            };

            // Adjust message and severity based on competitor overlap
            if (competitorConflict.hasConflicts) {
              // CRITICAL: Rule violation + actual competitor conflicts
              enhancedViolation.severity = 'error' as const;
              const competitorList = competitorConflict.conflictingCompetitors.slice(0, 3).join(', ');
              const moreCount = competitorConflict.conflictingCompetitors.length > 3 ? 
                ` +${competitorConflict.conflictingCompetitors.length - 3} más` : '';
              
              enhancedViolation.message = `🚨 Valódi: ${violation.rule.name}: ${violation.actualIntervalMinutes} perc köz (${violation.requiredIntervalMinutes} perc szükséges) | Érintett versenyzők: ${competitorList}${moreCount}`;
            } else {
              // INFO: Rule violation but no competitor overlap
              enhancedViolation.severity = 'info' as const;
              enhancedViolation.message = `ℹ️ Elméleti: ${violation.rule.name}: ${violation.actualIntervalMinutes} perc köz (${violation.requiredIntervalMinutes} perc szükséges) | Nincs közös versenyző a két futamban`;
            }

            return enhancedViolation;
          } catch (error) {
            console.error('Error checking competitor conflicts for violation:', error);
            return violation; // Return original if competitor check fails
          }
        })
      );

      // Sort by priority: competitor conflicts first
      return enhancedViolations.sort((a, b) => {
        const aPriority = (a as any).competitorOverlap && a.severity === 'error' ? 100 :
          a.severity === 'error' ? 50 :
          (a as any).competitorOverlap ? 30 :
          a.severity === 'info' ? 10 : 0;
        
        const bPriority = (b as any).competitorOverlap && b.severity === 'error' ? 100 :
          b.severity === 'error' ? 50 :
          (b as any).competitorOverlap ? 30 :
          b.severity === 'info' ? 10 : 0;
        
        return bPriority - aPriority; // Higher priority first
      });
    } catch (error) {
      console.error('Error in competitor-aware rule checking:', error);
      // Fall back to normal rule checking
      const rules = ruleIds 
        ? await Promise.all(ruleIds.map(id => BackendAPIService.getRuleById(id)).filter(Boolean))
        : await BackendAPIService.getActiveRules();
      return await ConflictDetector.detectConflicts(scheduleRaces, rules);
    }
  });

  // Violation dismissal operations
  ipcMain.handle('db:dismissViolation', async (_, scheduleId: number, violationHash: string) => {
    // return await RuleService.dismissViolation(scheduleId, violationHash); // OLD PRISMA VERSION
    return await BackendAPIService.dismissViolation(scheduleId, violationHash); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getDismissedViolations', async (_, scheduleId: number) => {
    // return await RuleService.getDismissedViolations(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.getDismissedViolations(scheduleId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:undismissViolation', async (_, scheduleId: number, violationHash: string) => {
    // return await RuleService.undismissViolation(scheduleId, violationHash); // OLD PRISMA VERSION
    return await BackendAPIService.undismissViolation(scheduleId, violationHash); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:clearDismissedViolations', async (_, scheduleId: number) => {
    // return await RuleService.clearDismissedViolations(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.clearDismissedViolations(scheduleId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getDismissedViolationCount', async (_, scheduleId: number) => {
    // return await RuleService.getDismissedViolationCount(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.getDismissedViolationCount(scheduleId); // NEW BACKEND VERSION
  });
  
  ipcMain.handle('db:getStats', async () => {
    // return await RaceService.getStats(); // OLD PRISMA VERSION
    return await BackendAPIService.getStats(); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:updateRaceHidden', async (_, raceId: number, hidden: boolean) => {
    // return await RaceService.updateRaceHidden(raceId, hidden); // OLD PRISMA VERSION
    return await BackendAPIService.updateRaceHidden(raceId, hidden); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:saveScheduleWithSections', async (_, name: string, sectionsData: any[], pdfExtractionId?: number) => {
    // return await ScheduleService.saveScheduleWithSections(name, sectionsData, pdfExtractionId); // OLD PRISMA VERSION
    return await BackendAPIService.saveScheduleWithSections(name, sectionsData, pdfExtractionId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:updateScheduleWithSections', async (_, scheduleId: number, name: string, sectionsData: any[], pdfExtractionId?: number) => {
    // return await ScheduleService.updateScheduleWithSections(scheduleId, name, sectionsData, pdfExtractionId); // OLD PRISMA VERSION
    return await BackendAPIService.updateScheduleWithSections(scheduleId, name, sectionsData, pdfExtractionId); // NEW BACKEND VERSION
  });

  // Schedule section operations - MIGRATED TO BACKEND API
  ipcMain.handle('db:createScheduleSection', async (_, sectionData: any) => {
    // return await ScheduleService.createScheduleSection(sectionData); // OLD PRISMA VERSION
    return await BackendAPIService.createScheduleSection(sectionData); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getScheduleSections', async (_, scheduleId: number) => {
    // return await ScheduleService.getScheduleSections(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.getScheduleSections(scheduleId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getScheduleWithSections', async (_, scheduleId: number) => {
    // return await ScheduleService.getScheduleWithSections(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.getScheduleWithSections(scheduleId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getScheduleWithPDFContext', async (_, scheduleId: number) => {
    // return await ScheduleService.getScheduleWithPDFContext(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.getScheduleWithPDFContext(scheduleId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:deleteSchedule', async (_, scheduleId: number) => {
    // return await ScheduleService.deleteSchedule(scheduleId); // OLD PRISMA VERSION
    return await BackendAPIService.deleteSchedule(scheduleId); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:renameSchedule', async (_, scheduleId: number, newName: string) => {
    return await BackendAPIService.renameSchedule(scheduleId, newName); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getScheduleStatistics', async (_, scheduleId: number) => {
    return await BackendAPIService.getScheduleStatistics(scheduleId); // NEW BACKEND VERSION
  });

  // Schedule item operations - MIGRATED TO BACKEND API
  ipcMain.handle('db:createScheduleItem', async (_, scheduleId: number, sectionId: number, raceId: number, levelId: number, orderIndex: number, intervalMinutes?: number, notes?: string) => {
    // return await ScheduleService.createScheduleItem(scheduleId, sectionId, raceId, levelId, orderIndex, intervalMinutes || 15, notes); // OLD PRISMA VERSION
    return await BackendAPIService.createScheduleItem(scheduleId, sectionId, raceId, levelId, orderIndex, intervalMinutes || 15, notes); // NEW BACKEND VERSION
  });

  ipcMain.handle('db:getScheduleItemsBySection', async (_, sectionId: number) => {
    // return await ScheduleService.getScheduleItemsBySection(sectionId); // OLD PRISMA VERSION
    return await BackendAPIService.getScheduleItemsBySection(sectionId); // NEW BACKEND VERSION
  });

  // Export operations
  ipcMain.handle('export:scheduleToExcel', async (_, scheduleId: number, scheduleName: string) => {
    try {
      // Generate Excel file buffer
      const excelBuffer = await ExportService.exportScheduleToExcel(scheduleId);
      
      // Generate default filename
      const defaultFilename = ExportService.generateFilename(scheduleName);
      
      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Excel fájl mentése',
        defaultPath: defaultFilename,
        filters: [
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Mentés megszakítva' };
      }

      // Write file to selected path
      await fs.writeFile(result.filePath, excelBuffer);
      
      return { 
        success: true, 
        filename: path.basename(result.filePath),
        fullPath: result.filePath 
      };
    } catch (error) {
      console.error('Excel export error in main process:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt' 
      };
    }
  });



  // PDF Processor IPC handlers (using main process functions)
  ipcMain.handle('pdf:start', async () => {
    try {
      await startPDFProcessor();
      return { success: true };
    } catch (error) {
      console.error('PDF processor start error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt'
      };
    }
  });

  ipcMain.handle('pdf:stop', async () => {
    try {
      await stopPDFProcessor();
      return { success: true };
    } catch (error) {
      console.error('PDF processor stop error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt'
      };
    }
  });

  ipcMain.handle('pdf:process', async (_, filePath: string) => {
    try {
      return await processPDFFile(filePath);
    } catch (error) {
      console.error('PDF process error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt'
      };
    }
  });

  ipcMain.handle('pdf:getStatus', async () => {
    try {
      return {
        isRunning: pdfProcessorProcess !== null && !pdfProcessorProcess.killed,
        isReady: pdfProcessorReady,
        port: pdfProcessorPort,
        pid: pdfProcessorProcess?.pid
      };
    } catch (error) {
      console.error('PDF status error:', error);
      return {
        isRunning: false,
        isReady: false,
        port: 0,
        pid: undefined
      };
    }
  });

  ipcMain.handle('pdf:isReady', async () => {
    try {
      return await isPDFProcessorReady();
    } catch (error) {
      console.error('PDF ready check error:', error);
      return false;
    }
  });

  // PDF file selection dialog
  ipcMain.handle('pdf:selectFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'PDF fájl kiválasztása',
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, error: 'Fájl kiválasztás megszakítva' };
      }

      return { 
        success: true, 
        filePath: result.filePaths[0],
        fileName: path.basename(result.filePaths[0])
      };
    } catch (error) {
      console.error('File selection error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Fájl kiválasztási hiba' 
      };
    }
  });

  // Enhanced PDF processing with race matching and competitor tracking
  ipcMain.handle('pdf:processAndMatch', async (event, filePath: string) => {
    try {
      // First process the PDF with main process function
      const pdfResult = await processPDFFile(filePath);
      
      if (!pdfResult.success || !pdfResult.data) {
        return pdfResult;
      }

      // Then match races and store competitor data
      const filename = path.basename(filePath);
      
      // Calculate file hash for deduplication (same as original TypeScript service)
      let fileHash: string | undefined = undefined;
      try {
        // Calculate hash using Node.js crypto (same approach as TypeScript service)
        const crypto = require('crypto');
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          console.log(`Calculated file hash: ${fileHash}`);
        }
      } catch (error) {
        console.warn('Failed to calculate file hash:', error);
        // Continue without hash - backend will handle gracefully
      }
      
      const matchResult = await BackendAPIService.processPDFAndMatch(filename, pdfResult.data, fileHash);
      
      return matchResult;
    } catch (error) {
      console.error('PDF processing and matching error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt',
        extractedRaces: [],
        totalCompetitors: 0,
        totalEntries: 0
      };
    }
  });

  ipcMain.handle('pdf:getFilteredRaces', async (_, pdfExtractionId: number) => {
    try {
      // return await RaceMatchingService.getFilteredRaces(pdfExtractionId); // OLD PRISMA VERSION
      return await BackendAPIService.getFilteredRaces(pdfExtractionId); // NEW BACKEND VERSION
    } catch (error) {
      console.error('Error getting filtered races:', error);
      return [];
    }
  });

  ipcMain.handle('pdf:getCompetitorData', async (_, pdfExtractionId: number) => {
    try {
      // const competitorMap = await RaceMatchingService.getCompetitorData(pdfExtractionId); // OLD PRISMA VERSION
      const competitorMap = await BackendAPIService.getCompetitorData(pdfExtractionId); // NEW BACKEND VERSION
      // Convert Map to plain object for IPC transfer
      return Object.fromEntries(competitorMap);
    } catch (error) {
      console.error('Error getting competitor data:', error);
      return {};
    }
  });

  ipcMain.handle('pdf:getExtractionStats', async (_, pdfExtractionId: number) => {
    try {
      // return await RaceMatchingService.getPDFExtractionStats(pdfExtractionId); // OLD PRISMA VERSION
      return await BackendAPIService.getPDFExtractionStats(pdfExtractionId); // NEW BACKEND VERSION
    } catch (error) {
      console.error('Error getting extraction stats:', error);
      return null;
    }
  });

  // PDF data lifecycle management
  ipcMain.handle('pdf:cleanupExpiredSessions', async () => {
    try {
      // return await RaceMatchingService.cleanupExpiredSessions(); // OLD PRISMA VERSION
      return await BackendAPIService.cleanupExpiredSessions(); // NEW BACKEND VERSION
    } catch (error) {
      console.error('Error during PDF cleanup:', error);
      return { deletedExtractions: 0, deletedRecords: 0 };
    }
  });

  // PDF management operations
  ipcMain.handle('pdf:getAllExtractions', async () => {
    try {
      // return await RaceMatchingService.getAllPDFExtractions(); // OLD PRISMA VERSION
      return await BackendAPIService.getAllPDFExtractions(); // NEW BACKEND VERSION
    } catch (error) {
      console.error('Error getting all PDF extractions:', error);
      return [];
    }
  });

  ipcMain.handle('pdf:deleteExtraction', async (_, pdfExtractionId: number) => {
    try {
      // return await RaceMatchingService.deletePDFExtraction(pdfExtractionId); // OLD PRISMA VERSION
      return await BackendAPIService.deletePDFExtraction(pdfExtractionId); // NEW BACKEND VERSION
    } catch (error) {
      console.error('Error deleting PDF extraction:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

  // Get app info for renderer process
  ipcMain.handle('app:getInfo', async () => {
    return {
      isPackaged: app.isPackaged,
      resourcesPath: process.resourcesPath || '',
      appPath: app.getAppPath(),
      platform: process.platform
    };
  });

  // Sample PDF download functionality
  ipcMain.handle('pdf:downloadSample', async () => {
    try {
      const axios = require('axios');
      const fs = require('fs').promises;
      const path = require('path');
      const { app } = require('electron');

      // Get user's Downloads directory
      const downloadsPath = app.getPath('downloads');
      const filename = 'sample-nevezetek-2025.pdf';
      const filePath = path.join(downloadsPath, filename);

      console.log('Downloading sample PDF to:', filePath);

      // Download from the main backend (assuming it runs on port 8080)
      const backendUrl = 'http://localhost:8080';
      const response = await axios.get(`${backendUrl}/api/static/sample-pdf`, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      if (response.status === 200) {
        // Write the file to Downloads folder
        await fs.writeFile(filePath, response.data);

        console.log(`Sample PDF downloaded successfully to: ${filePath}`);
        return {
          success: true,
          filePath: filePath
        };
      } else {
        console.error('Sample PDF download failed:', response.status);
        return {
          success: false,
          error: `A letöltés sikertelen volt (HTTP ${response.status})`
        };
      }

    } catch (error) {
      console.error('Error downloading sample PDF:', error);

      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'A backend szolgáltatás nem elérhető'
        };
      } else if (error.response?.status === 404) {
        return {
          success: false,
          error: 'A minta PDF nem található a szerveren'
        };
      } else if (error.code === 'ENOENT' || error.code === 'EACCES') {
        return {
          success: false,
          error: 'Nincs írási jogosultság a Letöltések mappához'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt a letöltés során'
      };
    }
  });

  // Competitor analysis operations
  ipcMain.handle('competitor:analyzeSchedules', async (_, scheduleRaces: ScheduleRace[], pdfExtractionId?: number) => {
    try {
      return await BackendAPIService.analyzeCompetitorSchedules(scheduleRaces, pdfExtractionId);
    } catch (error) {
      console.error('Error analyzing competitor schedules:', error);
      return [];
    }
  });

  ipcMain.handle('competitor:checkConflicts', async (_, race1Id: number, race2Id: number, pdfExtractionId?: number) => {
    try {
      return await BackendAPIService.checkCompetitorConflicts(race1Id, race2Id, pdfExtractionId);
    } catch (error) {
      console.error('Error checking competitor conflicts:', error);
      return { hasConflicts: false, conflictingCompetitors: [], competitorCount: 0 };
    }
  });

  ipcMain.handle('competitor:getRaceSummary', async (_, raceId: number, pdfExtractionId?: number) => {
    try {
      return await BackendAPIService.getRaceCompetitorSummary(raceId, pdfExtractionId);
    } catch (error) {
      console.error('Error getting race competitor summary:', error);
      return { entryCount: 0, topCompetitors: [], organizations: [] };
    }
  });

  ipcMain.handle('competitor:getHighRiskCompetitors', async (_, pdfExtractionId: number) => {
    try {
      return await BackendAPIService.getHighRiskCompetitors(pdfExtractionId);
    } catch (error) {
      console.error('Error getting high risk competitors:', error);
      return [];
    }
  });

  ipcMain.handle('competitor:getStats', async (_, pdfExtractionId: number) => {
    try {
      return await BackendAPIService.getCompetitorStats(pdfExtractionId);
    } catch (error) {
      console.error('Error getting competitor stats:', error);
      return {
        totalCompetitors: 0,
        totalEntries: 0,
        racesWithEntries: 0,
        organizationsRepresented: 0
      };
    }
  });
  
  // Perform startup cleanup of expired PDF session data
  (async () => {
    try {
      console.log('Performing startup cleanup of expired PDF session data...');
      // const result = await RaceMatchingService.cleanupExpiredSessions(); // OLD PRISMA VERSION
      const result = await BackendAPIService.cleanupExpiredSessions(); // NEW BACKEND VERSION
      if (result.deletedExtractions > 0) {
        console.log(`Startup cleanup completed: ${result.deletedExtractions} expired PDF extractions removed, ${result.deletedRecords} total records deleted`);
      } else {
        console.log('Startup cleanup completed: no expired data to clean');
      }
    } catch (error) {
      console.error('Error during startup cleanup:', error);
    }
  })();
  
  createWindow();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  await initializeApp();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Close Prisma database connection
  // await closePrismaClient(); // REMOVED FOR PRISMA ELIMINATION - Backend handles database cleanup
  
  // Stop backend service if running
  await backendService.stop();
  
  // Stop PDF processor if running
  await stopPDFProcessor();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
