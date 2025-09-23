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
import { pdfProcessorService } from './features/pdf/services/PDFProcessorService';
import { backendService } from './features/common/services/BackendService';
// import { RaceMatchingService } from './features/pdf/services/RaceMatchingService'; // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
// import { CompetitorService } from '../archive/CompetitorService.ts.old';
import { DatabaseInitializer } from './features/common/services/DatabaseInitializer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: false
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

  ipcMain.handle('db:getAllSeatCounts', async () => {
    return await BackendAPIService.getAllSeatCounts();
  });

  ipcMain.handle('db:getAllBoatTypes', async () => {
    return await BackendAPIService.getAllBoatTypes();
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
    try {
      console.log(`🔍 Rule validation started for ${scheduleRaces.length} races${ruleIds ? ` with specific rule IDs: ${ruleIds.join(', ')}` : ' with all active rules'}`);

      const rules = ruleIds
        ? await Promise.all(ruleIds.map(id => BackendAPIService.getRuleById(id)).filter(Boolean))
        : await BackendAPIService.getActiveRules();

      console.log(`📋 Retrieved ${rules.length} rules for validation`);

      if (rules.length === 0) {
        console.warn('⚠️ No rules available for validation - either no active rules exist or backend API failed');
        return [];
      }

      const violations = await ConflictDetector.detectConflicts(scheduleRaces, rules);
      console.log(`✅ Rule validation completed: ${violations.length} violations found`);

      return violations;
    } catch (error) {
      console.error('❌ Error during rule validation:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');

      // Return empty array to prevent UI crashes, but log the failure
      console.warn('🔄 Returning empty violations array due to validation failure');
      return [];
    }
  });

  // Enhanced rule checking with competitor awareness
  ipcMain.handle('db:checkScheduleViolationsWithCompetitors', async (_, scheduleRaces: ScheduleRace[], pdfExtractionId?: number, ruleIds?: number[]) => {
    try {
      console.log(`🔍🧠 Competitor-aware rule validation started for ${scheduleRaces.length} races${pdfExtractionId ? ` with PDF extraction ID: ${pdfExtractionId}` : ' without PDF data'}`);

      const rules = ruleIds
        ? await Promise.all(ruleIds.map(id => BackendAPIService.getRuleById(id)).filter(Boolean))
        : await BackendAPIService.getActiveRules();

      console.log(`📋 Retrieved ${rules.length} rules for competitor-aware validation`);

      if (rules.length === 0) {
        console.warn('⚠️ No rules available for competitor-aware validation - either no active rules exist or backend API failed');
        return [];
      }

      if (!pdfExtractionId) {
        console.log('📝 No PDF extraction ID provided, falling back to standard rule checking');
        return await ConflictDetector.detectConflicts(scheduleRaces, rules);
      }

      // Get traditional rule violations first
      const baseViolations = await ConflictDetector.detectConflicts(scheduleRaces, rules);
      console.log(`📊 Found ${baseViolations.length} base rule violations, enhancing with competitor data...`);

      // Enhance each violation with competitor information
      const enhancedViolations = await Promise.all(
        baseViolations.map(async (violation, index) => {
          try {
            // Check for competitor conflicts between the two races
            const competitorConflict = await BackendAPIService.checkCompetitorConflicts(
              violation.race1.id,
              violation.race2.id,
              pdfExtractionId
            );

            console.log(`🔍 Violation ${index + 1}/${baseViolations.length}: ${violation.race1.name} ↔ ${violation.race2.name} - ${competitorConflict.hasConflicts ? `🚨 ${competitorConflict.competitorCount} competitor conflicts` : '✅ no competitor conflicts'}`);

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
            console.error(`❌ Error checking competitor conflicts for violation ${index + 1}: ${violation.race1.name} ↔ ${violation.race2.name}:`, error);
            console.warn(`🔄 Falling back to basic violation for this race pair`);
            return violation; // Return original if competitor check fails
          }
        })
      );

      // Sort by priority: competitor conflicts first
      const sortedViolations = enhancedViolations.sort((a, b) => {
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

      const criticalViolations = sortedViolations.filter((v: any) => v.competitorOverlap && v.severity === 'error').length;
      const theoreticalViolations = sortedViolations.filter((v: any) => !v.competitorOverlap || v.severity === 'info').length;

      console.log(`✅ Competitor-aware rule validation completed: ${sortedViolations.length} total violations (${criticalViolations} critical with competitor conflicts, ${theoreticalViolations} theoretical)`);

      return sortedViolations;
    } catch (error) {
      console.error('❌ Error in competitor-aware rule checking:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');
      console.warn('🔄 Falling back to standard rule checking without competitor awareness');

      try {
        // Fall back to normal rule checking
        const rules = ruleIds
          ? await Promise.all(ruleIds.map(id => BackendAPIService.getRuleById(id)).filter(Boolean))
          : await BackendAPIService.getActiveRules();

        const fallbackViolations = await ConflictDetector.detectConflicts(scheduleRaces, rules);
        console.log(`✅ Fallback rule validation completed: ${fallbackViolations.length} violations found`);
        return fallbackViolations;
      } catch (fallbackError) {
        console.error('❌ Even fallback rule checking failed:', fallbackError);
        console.warn('🔄 Returning empty violations array to prevent UI crashes');
        return [];
      }
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

  // PDF processing operations
  ipcMain.handle('pdf:process', async (_, filePath: string) => {
    try {
      const result = await pdfProcessorService.processPDF(filePath);
      return result;
    } catch (error) {
      console.error('PDF processing error in main process:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt' 
      };
    }
  });

  ipcMain.handle('pdf:getStatus', async () => {
    return pdfProcessorService.getStatus();
  });

  ipcMain.handle('pdf:start', async () => {
    try {
      await pdfProcessorService.start();
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
      await pdfProcessorService.stop();
      return { success: true };
    } catch (error) {
      console.error('PDF processor stop error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Ismeretlen hiba történt' 
      };
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
      // First process the PDF with existing service
      const pdfResult = await pdfProcessorService.processPDF(filePath);
      
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
      console.log(`🏁 Retrieving filtered races for PDF extraction ID: ${pdfExtractionId}`);

      if (!pdfExtractionId || pdfExtractionId <= 0) {
        console.warn('⚠️ Invalid PDF extraction ID provided for filtered races retrieval');
        return [];
      }

      const filteredRaces = await BackendAPIService.getFilteredRaces(pdfExtractionId);

      if (!filteredRaces) {
        console.warn(`⚠️ BackendAPIService.getFilteredRaces returned null/undefined for PDF extraction ID: ${pdfExtractionId}`);
        return [];
      }

      if (!Array.isArray(filteredRaces)) {
        console.error(`❌ Invalid response format from getFilteredRaces - expected array, got: ${typeof filteredRaces}`);
        return [];
      }

      console.log(`✅ Successfully retrieved ${filteredRaces.length} filtered races for PDF extraction ID: ${pdfExtractionId}`);

      if (filteredRaces.length === 0) {
        console.warn(`⚠️ No filtered races found for PDF extraction ID: ${pdfExtractionId} - this may indicate:
  - PDF extraction failed or contains no race data
  - Race matching process failed
  - PDF data was cleaned up or expired
  - Backend database query issue`);
      }

      return filteredRaces;
    } catch (error) {
      console.error(`❌ Error getting filtered races for PDF extraction ID: ${pdfExtractionId}:`, error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');

      // Provide more specific error context
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          console.error(`🔍 PDF extraction ID ${pdfExtractionId} not found in backend - may have been cleaned up or never existed`);
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          console.error(`🔧 Backend server error while retrieving filtered races - check backend logs`);
        } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          console.error(`⏱️ Timeout while retrieving filtered races - backend may be overloaded`);
        }
      }

      console.warn('🔄 Returning empty races array to prevent UI crashes');
      return [];
    }
  });

  ipcMain.handle('pdf:getCompetitorData', async (_, pdfExtractionId: number) => {
    try {
      console.log(`🏃 Retrieving competitor data for PDF extraction ID: ${pdfExtractionId}`);

      if (!pdfExtractionId || pdfExtractionId <= 0) {
        console.warn('⚠️ Invalid PDF extraction ID provided for competitor data retrieval');
        return {};
      }

      const competitorMap = await BackendAPIService.getCompetitorData(pdfExtractionId);

      if (!competitorMap) {
        console.warn(`⚠️ BackendAPIService.getCompetitorData returned null/undefined for PDF extraction ID: ${pdfExtractionId}`);
        return {};
      }

      if (!(competitorMap instanceof Map)) {
        console.error(`❌ Invalid response format from getCompetitorData - expected Map, got: ${typeof competitorMap}`);
        return {};
      }

      // Convert Map to plain object for IPC transfer
      const competitorObject = Object.fromEntries(competitorMap);
      const competitorCount = Object.keys(competitorObject).length;

      console.log(`✅ Successfully retrieved competitor data for PDF extraction ID: ${pdfExtractionId} - ${competitorCount} competitors`);

      if (competitorCount === 0) {
        console.warn(`⚠️ No competitor data found for PDF extraction ID: ${pdfExtractionId} - this may indicate:
  - PDF extraction failed to parse competitor information
  - PDF contains no participant data
  - Competitor matching process failed
  - PDF data was cleaned up or expired
  - Backend database query issue`);
      } else {
        // Log a sample of competitor names for debugging (first 3)
        const sampleCompetitors = Object.keys(competitorObject).slice(0, 3);
        console.log(`🔍 Sample competitors: ${sampleCompetitors.join(', ')}${competitorCount > 3 ? ` +${competitorCount - 3} more` : ''}`);
      }

      return competitorObject;
    } catch (error) {
      console.error(`❌ Error getting competitor data for PDF extraction ID: ${pdfExtractionId}:`, error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack available');

      // Provide more specific error context
      if (error instanceof Error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          console.error(`🔍 PDF extraction ID ${pdfExtractionId} not found in backend - may have been cleaned up or never existed`);
        } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
          console.error(`🔧 Backend server error while retrieving competitor data - check backend logs`);
        } else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          console.error(`⏱️ Timeout while retrieving competitor data - backend may be overloaded`);
        }
      }

      console.warn('🔄 Returning empty competitor data object to prevent UI crashes');
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
  await pdfProcessorService.stop();
  
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
