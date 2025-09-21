import { contextBridge, ipcRenderer } from 'electron';
import { RaceWithAgeGroups, Schedule, ScheduleItemWithRace, RuleWithConditions, CreateRuleData, RuleViolation, ScheduleRace, ScheduleSection, ScheduleItemWithRaceAndSection, ScheduleWithSections, CreateScheduleSectionData, Level, PDFProcessingResult, RaceWithCompetitorData, CompetitorSchedule } from '../shared/types/race';
import { ScheduleStatistics } from './data/services/BackendAPIService';

export interface ElectronAPI {
  // Database operations
  getAllRaces: () => Promise<RaceWithAgeGroups[]>;
  searchRaces: (searchTerm: string) => Promise<RaceWithAgeGroups[]>;
  getAllAgeGroups: () => Promise<{ id: number; name: string; createdAt: Date; }[]>;
  getAllLevels: () => Promise<Level[]>;
  getDefaultLevel: () => Promise<Level>;
  getAllSchedules: () => Promise<Schedule[]>;
  getScheduleItems: (scheduleId: number) => Promise<ScheduleItemWithRace[]>;
  // Rule operations
  getAllRules: () => Promise<RuleWithConditions[]>;
  getActiveRules: () => Promise<RuleWithConditions[]>;
  getRuleById: (id: number) => Promise<RuleWithConditions | null>;
  createRule: (data: CreateRuleData) => Promise<RuleWithConditions>;
  updateRule: (id: number, data: Partial<CreateRuleData>) => Promise<RuleWithConditions | null>;
  deleteRule: (id: number) => Promise<boolean>;
  toggleRuleActive: (id: number, isActive: boolean) => Promise<boolean>;
  searchRules: (searchTerm: string) => Promise<RuleWithConditions[]>;
  getRuleStats: () => Promise<{ totalRules: number, activeRules: number, inactiveRules: number }>;
  
  // Rule engine operations
  checkScheduleViolations: (scheduleRaces: ScheduleRace[], ruleIds?: number[]) => Promise<RuleViolation[]>;
  checkScheduleViolationsWithCompetitors: (scheduleRaces: ScheduleRace[], pdfExtractionId?: number, ruleIds?: number[]) => Promise<RuleViolation[]>;
  
  // Violation dismissal operations
  dismissViolation: (scheduleId: number, violationHash: string) => Promise<boolean>;
  getDismissedViolations: (scheduleId: number) => Promise<string[]>;
  undismissViolation: (scheduleId: number, violationHash: string) => Promise<boolean>;
  clearDismissedViolations: (scheduleId: number) => Promise<boolean>;
  getDismissedViolationCount: (scheduleId: number) => Promise<number>;
  
  getStats: () => Promise<{ races: number, ageGroups: number, schedules: number }>;
  updateRaceHidden: (raceId: number, hidden: boolean) => Promise<boolean>;
  // Schedule section operations
  createScheduleSection: (sectionData: CreateScheduleSectionData) => Promise<number>;
  getScheduleSections: (scheduleId: number) => Promise<ScheduleSection[]>;
  getScheduleItemsBySection: (sectionId: number) => Promise<ScheduleItemWithRaceAndSection[]>;
  
  // Schedule item operations
  createScheduleItem: (scheduleId: number, sectionId: number, raceId: number, levelId: number, orderIndex: number, intervalMinutes?: number, notes?: string) => Promise<number>;
  
  // Unified schedule operations
  saveScheduleWithSections: (name: string, sectionsData: Array<{
    dayNumber: number,
    sectionType: 'délelőtt' | 'délután',
    startTime: string,
    items: Array<{
      raceId: number,
      levelId: number,
      orderIndex: number,
      intervalMinutes: number,
      notes?: string
    }>
  }>, pdfExtractionId?: number) => Promise<number>;
  updateScheduleWithSections: (scheduleId: number, name: string, sectionsData: Array<{
    dayNumber: number,
    sectionType: 'délelőtt' | 'délután',
    startTime: string,
    items: Array<{
      raceId: number,
      levelId: number,
      orderIndex: number,
      intervalMinutes: number,
      notes?: string
    }>
  }>, pdfExtractionId?: number) => Promise<number>;
  getScheduleWithSections: (scheduleId: number) => Promise<ScheduleWithSections | null>;
  getScheduleWithPDFContext: (scheduleId: number) => Promise<{
    schedule: ScheduleWithSections | null;
    pdfExtractionId?: number;
    hasPDFData: boolean;
  }>;
  deleteSchedule: (scheduleId: number) => Promise<void>;
  renameSchedule: (scheduleId: number, newName: string) => Promise<void>;
  getScheduleStatistics: (scheduleId: number) => Promise<ScheduleStatistics>;

  // Export operations
  exportScheduleToExcel: (scheduleId: number, scheduleName: string) => Promise<{
    success: boolean;
    filename?: string;
    fullPath?: string;
    error?: string;
  }>;

  // PDF processing operations
  pdfProcess: (filePath: string) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }>;
  pdfGetStatus: () => Promise<{
    isRunning: boolean;
    isReady: boolean;
    port: number;
    pid?: number;
  }>;
  pdfStart: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  pdfStop: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  pdfSelectFile: () => Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    error?: string;
  }>;
  pdfIsReady: () => Promise<boolean>;
  pdfProcess: (filePath: string) => Promise<{
    success: boolean;
    data?: any[];
    error?: string;
    errorCode?: string;
    userMessage?: string;
  }>;
  pdfGetStatus: () => Promise<{
    isRunning: boolean;
    isReady: boolean;
    port: number;
    pid?: number;
  }>;

  // App info for renderer process
  getAppInfo: () => Promise<{
    isPackaged: boolean;
    resourcesPath: string;
    appPath: string;
    platform: string;
  }>;

  // Sample PDF download functionality
  downloadSamplePDF: () => Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }>;

  // Enhanced PDF processing with race matching and competitor tracking
  pdfProcessAndMatch: (filePath: string) => Promise<PDFProcessingResult>;
  pdfGetFilteredRaces: (pdfExtractionId: number) => Promise<RaceWithCompetitorData[]>;
  pdfGetCompetitorData: (pdfExtractionId: number) => Promise<Record<string, any>>;
  pdfGetExtractionStats: (pdfExtractionId: number) => Promise<{
    filename: string;
    totalRaces: number;
    matchedRaces: number;
    totalCompetitors: number;
    totalEntries: number;
    createdAt: Date;
  } | null>;
  
  
  // PDF data lifecycle management
  pdfCleanupExpiredSessions: () => Promise<{ deletedExtractions: number; deletedRecords: number }>;
  
  // PDF management operations
  pdfGetAllExtractions: () => Promise<Array<{
    id: number;
    filename: string;
    fileHash: string | null;
    totalRaces: number;
    totalCompetitors: number;
    totalEntries: number;
    extractionStatus: string;
    status: string;
    linkedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    linkedSchedules: string[];
    competitorEntriesCount: number;
    raceAssociationsCount: number;
    schedulesUsingCount: number;
    canDelete: boolean;
  }>>;
  pdfDeleteExtraction: (pdfExtractionId: number) => Promise<{ success: boolean; error?: string }>;
  
  // Competitor analysis operations
  competitorAnalyzeSchedules: (scheduleRaces: ScheduleRace[], pdfExtractionId?: number) => Promise<CompetitorSchedule[]>;
  competitorCheckConflicts: (race1Id: number, race2Id: number, pdfExtractionId?: number) => Promise<{
    hasConflicts: boolean;
    conflictingCompetitors: string[];
    competitorCount: number;
  }>;
  competitorGetRaceSummary: (raceId: number, pdfExtractionId?: number) => Promise<{
    entryCount: number;
    topCompetitors: string[];
    organizations: string[];
  }>;
  competitorGetHighRiskCompetitors: (pdfExtractionId: number) => Promise<CompetitorSchedule[]>;
  competitorGetStats: (pdfExtractionId: number) => Promise<{
    totalCompetitors: number;
    totalEntries: number;
    racesWithEntries: number;
    organizationsRepresented: number;
  }>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getAllRaces: () => ipcRenderer.invoke('db:getAllRaces'),
  searchRaces: (searchTerm: string) => ipcRenderer.invoke('db:searchRaces', searchTerm),
  getAllAgeGroups: () => ipcRenderer.invoke('db:getAllAgeGroups'),
  getAllLevels: () => ipcRenderer.invoke('db:getAllLevels'),
  getDefaultLevel: () => ipcRenderer.invoke('db:getDefaultLevel'),
  getAllSchedules: () => ipcRenderer.invoke('db:getAllSchedules'),
  getScheduleItems: (scheduleId: number) => ipcRenderer.invoke('db:getScheduleItems', scheduleId),
  // Rule operations
  getAllRules: () => ipcRenderer.invoke('db:getAllRules'),
  getActiveRules: () => ipcRenderer.invoke('db:getActiveRules'),
  getRuleById: (id: number) => ipcRenderer.invoke('db:getRuleById', id),
  createRule: (data: CreateRuleData) => ipcRenderer.invoke('db:createRule', data),
  updateRule: (id: number, data: Partial<CreateRuleData>) => ipcRenderer.invoke('db:updateRule', id, data),
  deleteRule: (id: number) => ipcRenderer.invoke('db:deleteRule', id),
  toggleRuleActive: (id: number, isActive: boolean) => ipcRenderer.invoke('db:toggleRuleActive', id, isActive),
  searchRules: (searchTerm: string) => ipcRenderer.invoke('db:searchRules', searchTerm),
  getRuleStats: () => ipcRenderer.invoke('db:getRuleStats'),
  
  // Rule engine operations
  checkScheduleViolations: (scheduleRaces: ScheduleRace[], ruleIds?: number[]) => 
    ipcRenderer.invoke('db:checkScheduleViolations', scheduleRaces, ruleIds),
  checkScheduleViolationsWithCompetitors: (scheduleRaces: ScheduleRace[], pdfExtractionId?: number, ruleIds?: number[]) => 
    ipcRenderer.invoke('db:checkScheduleViolationsWithCompetitors', scheduleRaces, pdfExtractionId, ruleIds),
  
  // Violation dismissal operations
  dismissViolation: (scheduleId: number, violationHash: string) => 
    ipcRenderer.invoke('db:dismissViolation', scheduleId, violationHash),
  getDismissedViolations: (scheduleId: number) => 
    ipcRenderer.invoke('db:getDismissedViolations', scheduleId),
  undismissViolation: (scheduleId: number, violationHash: string) => 
    ipcRenderer.invoke('db:undismissViolation', scheduleId, violationHash),
  clearDismissedViolations: (scheduleId: number) => 
    ipcRenderer.invoke('db:clearDismissedViolations', scheduleId),
  getDismissedViolationCount: (scheduleId: number) => 
    ipcRenderer.invoke('db:getDismissedViolationCount', scheduleId),
  
  getStats: () => ipcRenderer.invoke('db:getStats'),
  updateRaceHidden: (raceId: number, hidden: boolean) => ipcRenderer.invoke('db:updateRaceHidden', raceId, hidden),
  // Schedule section operations
  createScheduleSection: (sectionData: CreateScheduleSectionData) => 
    ipcRenderer.invoke('db:createScheduleSection', sectionData),
  getScheduleSections: (scheduleId: number) => 
    ipcRenderer.invoke('db:getScheduleSections', scheduleId),
  getScheduleItemsBySection: (sectionId: number) => 
    ipcRenderer.invoke('db:getScheduleItemsBySection', sectionId),
    
  // Schedule item operations
  createScheduleItem: (scheduleId: number, sectionId: number, raceId: number, levelId: number, orderIndex: number, intervalMinutes?: number, notes?: string) => 
    ipcRenderer.invoke('db:createScheduleItem', scheduleId, sectionId, raceId, levelId, orderIndex, intervalMinutes, notes),
    
  // Unified schedule operations
  saveScheduleWithSections: (name: string, sectionsData: any[], pdfExtractionId?: number) => 
    ipcRenderer.invoke('db:saveScheduleWithSections', name, sectionsData, pdfExtractionId),
  updateScheduleWithSections: (scheduleId: number, name: string, sectionsData: any[], pdfExtractionId?: number) => 
    ipcRenderer.invoke('db:updateScheduleWithSections', scheduleId, name, sectionsData, pdfExtractionId),
  getScheduleWithSections: (scheduleId: number) => 
    ipcRenderer.invoke('db:getScheduleWithSections', scheduleId),
  getScheduleWithPDFContext: (scheduleId: number) => 
    ipcRenderer.invoke('db:getScheduleWithPDFContext', scheduleId),
  deleteSchedule: (scheduleId: number) =>
    ipcRenderer.invoke('db:deleteSchedule', scheduleId),
  renameSchedule: (scheduleId: number, newName: string) =>
    ipcRenderer.invoke('db:renameSchedule', scheduleId, newName),
  getScheduleStatistics: (scheduleId: number) =>
    ipcRenderer.invoke('db:getScheduleStatistics', scheduleId),

  // Export operations
  exportScheduleToExcel: (scheduleId: number, scheduleName: string) => 
    ipcRenderer.invoke('export:scheduleToExcel', scheduleId, scheduleName),

  // PDF processing operations
  pdfProcess: (filePath: string) => ipcRenderer.invoke('pdf:process', filePath),
  pdfGetStatus: () => ipcRenderer.invoke('pdf:getStatus'),
  pdfStart: () => ipcRenderer.invoke('pdf:start'),
  pdfStop: () => ipcRenderer.invoke('pdf:stop'),
  pdfSelectFile: () => ipcRenderer.invoke('pdf:selectFile'),
  pdfIsReady: () => ipcRenderer.invoke('pdf:isReady'),

  // App info for renderer process
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // Sample PDF download functionality
  downloadSamplePDF: () => ipcRenderer.invoke('pdf:downloadSample'),

  // Enhanced PDF processing with race matching and competitor tracking
  pdfProcessAndMatch: (filePath: string) => ipcRenderer.invoke('pdf:processAndMatch', filePath),
  pdfGetFilteredRaces: (pdfExtractionId: number) => ipcRenderer.invoke('pdf:getFilteredRaces', pdfExtractionId),
  pdfGetCompetitorData: (pdfExtractionId: number) => ipcRenderer.invoke('pdf:getCompetitorData', pdfExtractionId),
  pdfGetExtractionStats: (pdfExtractionId: number) => ipcRenderer.invoke('pdf:getExtractionStats', pdfExtractionId),
  
  
  // PDF data lifecycle management
  pdfCleanupExpiredSessions: () => ipcRenderer.invoke('pdf:cleanupExpiredSessions'),
  
  // PDF management operations
  pdfGetAllExtractions: () => ipcRenderer.invoke('pdf:getAllExtractions'),
  pdfDeleteExtraction: (pdfExtractionId: number) => ipcRenderer.invoke('pdf:deleteExtraction', pdfExtractionId),
  
  // Competitor analysis operations
  competitorAnalyzeSchedules: (scheduleRaces: ScheduleRace[], pdfExtractionId?: number) => 
    ipcRenderer.invoke('competitor:analyzeSchedules', scheduleRaces, pdfExtractionId),
  competitorCheckConflicts: (race1Id: number, race2Id: number, pdfExtractionId?: number) => 
    ipcRenderer.invoke('competitor:checkConflicts', race1Id, race2Id, pdfExtractionId),
  competitorGetRaceSummary: (raceId: number, pdfExtractionId?: number) => 
    ipcRenderer.invoke('competitor:getRaceSummary', raceId, pdfExtractionId),
  competitorGetHighRiskCompetitors: (pdfExtractionId: number) => 
    ipcRenderer.invoke('competitor:getHighRiskCompetitors', pdfExtractionId),
  competitorGetStats: (pdfExtractionId: number) => 
    ipcRenderer.invoke('competitor:getStats', pdfExtractionId),
} as ElectronAPI);
