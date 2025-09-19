// Native TypeScript interfaces - migrated from Prisma for independent type system
export interface Race {
  id: number
  name: string
  discipline: string // 'Kajak', 'Kenu', 'SUP', 'Kajakpóló', 'Parakenu', 'Sárkányhajó', 'Szlalom', 'Tengeri kajak'
  boatClass: string
  gender: string // 'Férfi', 'Női', 'Vegyes'
  distance: string
  occurrence: number // Track historical frequency for relevance sorting
  hidden: boolean // User can hide races they don't organize
  createdAt: string // ISO date string from backend
  updatedAt: string // ISO date string from backend
}

export interface AgeGroup {
  id: number
  name: string // e.g., "Serdülő - U15", "Serdülő - U16"
  createdAt: string // ISO date string from backend
}

export interface RaceAgeGroup {
  raceId: number
  ageGroupId: number
}

export interface Level {
  id: number
  name: string // e.g., "A Döntő", "I. Előfutam", "Döntő I."
  levelType: string // "döntő", "előfutam", "középfutam"
  sortOrder: number // For UI display ordering
  isDefault: boolean // Mark "Döntő I." as default
  createdAt: string // ISO date string from backend
}

export interface Schedule {
  id: number
  name: string
  pdfExtractionId: number | null // Link to PDF data for competitor-aware features
  createdAt: string // ISO date string from backend
  updatedAt: string // ISO date string from backend
}

export interface ScheduleSection {
  id: number
  scheduleId: number
  dayNumber: number
  sectionType: string // 'délelőtt', 'délután'
  startTime: string
  createdAt: string // ISO date string from backend
}

export interface ScheduleItem {
  id: number
  scheduleId: number
  sectionId: number
  raceId: number
  levelId: number // Reference to competitive level
  orderIndex: number
  intervalMinutes: number // Break time AFTER this race
  notes: string | null
  createdAt: string // ISO date string from backend
}

export interface Rule {
  id: number
  name: string
  description: string | null
  minIntervalMinutes: number
  isActive: boolean
  createdAt: string // ISO date string from backend
  updatedAt: string // ISO date string from backend
}

export interface RuleCondition {
  id: number
  ruleId: number
  conditionSet: string // "A" or "B" - which set of races this applies to
  field: string // "discipline", "boatClass", "gender", "distance", "ageGroups"
  operator: string // "equals", "contains", "not_equals", "in"
  value: string // the value to match against
}

export interface RuleMatching {
  id: number
  ruleId: number
  field: string // field that must have same value in both races
}

export interface DismissedRuleViolation {
  id: number
  scheduleId: number
  violationHash: string // Unique identifier: ruleId-race1Id-race1StartTime-race2Id-race2StartTime
  dismissedAt: string // ISO date string from backend
}

export interface PDFExtraction {
  id: number
  filename: string
  fileHash: string | null // SHA-256 hash for deduplication
  totalRaces: number
  totalCompetitors: number
  totalEntries: number
  extractionStatus: string // "processing", "completed", "error"
  status: string // "session", "linked", "archived" - lifecycle management
  linkedAt: string | null // When data was promoted from session to linked
  expiresAt: string | null // When session data expires (null for linked data)
  createdAt: string // ISO date string from backend
}

export interface CompetitorEntry {
  id: number
  pdfExtractionId: number
  competitorId: string // Unique identifier from PDF
  competitorName: string
  organization: string | null // Club/organization
  birthYear: number | null
  createdAt: string // ISO date string from backend
}

export interface RaceCompetitorAssociation {
  id: number
  pdfExtractionId: number
  raceId: number // Database race ID (matched)
  competitorId: string // From PDF
  pdfRaceName: string // Original race name from PDF
  matchConfidence: number // 0.0 to 1.0 confidence score
  createdAt: string // ISO date string from backend
}

// Enhanced types with relationships (using the native interfaces above)

export type RaceWithAgeGroups = Race & {
  ageGroups: AgeGroup[]
}

// Enhanced types for PDF processing and competitor data
export type PDFExtractionWithDetails = PDFExtraction & {
  competitorEntries: CompetitorEntry[]
  raceCompetitorAssociations: RaceCompetitorAssociation[]
}

export type RaceWithCompetitorData = RaceWithAgeGroups & {
  entryCount: number
  competitorIds: string[]
  topCompetitors: string[] // Sample of competitor names (first 3)
  pdfExtractionId?: number
}

export type CompetitorSchedule = {
  competitorId: string
  competitorName: string
  organization: string | null
  birthYear: number | null
  racePairs: CompetitorRacePairDetails[]
  totalRaces: number
  shortestInterval: number | null
  longestInterval: number | null
  riskLevel: 'low' | 'medium' | 'high'
}

// Legacy type - kept for backward compatibility
export type CompetitorRaceDetails = {
  raceId: number
  raceName: string
  scheduledTime: string
  estimatedDuration: number
  intervalToNext?: number
  recoveryTime?: number
  conflictLevel: 'none' | 'warning' | 'critical'
}

// New type for race pair analysis - matches CompetitorRacePairDetailsDto from backend
export type CompetitorRacePairDetails = {
  race1Id: number
  levelType1: string
  level1Id: number
  race1Name: string
  race1StartTime: string
  race2Id: number | null
  levelType2: string | null
  level2Id: number | null
  race2Name: string | null
  race2StartTime: string | null
  estimatedDuration: number
  intervalToNext: number | null
  recoveryTime: number | null
  conflictLevel: 'none' | 'warning' | 'critical'
}

// PDF Processing interfaces
export interface PDFProcessingResult {
  success: boolean
  pdfExtractionId?: number
  extractedRaces: ExtractedRace[]
  totalCompetitors: number
  totalEntries: number
  error?: string
  wasDeduplication?: boolean // True if data was reused from existing extraction with same hash
}

export interface ExtractedRace {
  id: string // From PDF
  name: string
  competitors: ExtractedCompetitor[]
  matchedDatabaseRaceId?: number
  matchConfidence: number
}

export interface ExtractedCompetitor {
  id: string // Unique competitor ID from PDF
  name: string
  organization: string | null
  birthYear: number | null
  raceEntries: string[] // List of race IDs they're entered in
}

// Race matching interfaces
export interface RaceMatch {
  extractedRace: ExtractedRace
  matchedRace?: Race
  confidence: number
  requiresManualReview: boolean
}

export interface PDFToScheduleData {
  pdfExtractionId: number
  filteredRaces: RaceWithCompetitorData[]
  competitorData: Map<string, CompetitorSchedule>
}

export type ScheduleItemWithRace = ScheduleItem & {
  race: RaceWithAgeGroups
  level: Level
  calculatedStartTime?: string // Computed at runtime
}

export type ScheduleItemWithRaceAndSection = ScheduleItemWithRace & {
  section: ScheduleSection
}

export type ScheduleWithSections = Schedule & {
  sections: ScheduleSection[]
}

// Section navigation state (keep this utility type)
export interface SectionNavigationState {
  current_day: number
  current_section: 'délelőtt' | 'délután'
  total_days: number
}

// Schedule mode for simplified vs full level selection
export type ScheduleMode = 'simplified' | 'full'

// For creating new races (keep this create type)
export interface CreateRaceData {
  name: string
  discipline: 'Kajak' | 'Kenu' | 'SUP' | 'Kajakpóló' | 'Parakenu' | 'Sárkányhajó' | 'Szlalom' | 'Tengeri kajak'
  boat_class: string
  gender: 'Férfi' | 'Női' | 'Vegyes'
  distance: string
  occurrence?: number
  hidden?: boolean
  age_group_ids: number[]
}

// For creating new schedule sections (used by services)
export interface CreateScheduleSectionData {
  scheduleId: number  // Use camelCase
  dayNumber: number   // Use camelCase
  sectionType: 'délelőtt' | 'délután'  // Use camelCase
  startTime: string   // Use camelCase
}

// For creating new schedule items with levels
export interface CreateScheduleItemData {
  scheduleId: number
  sectionId: number
  raceId: number
  levelId: number  // Reference to competitive level
  orderIndex: number
  intervalMinutes?: number
  notes?: string
}

// For in-memory section working data during schedule building
export interface SectionWorkingData {
  sectionId: number
  races: ScheduleRace[]
  intervals: number[]  // Break times between races (in minutes)
  settings: {
    startTime: string
    defaultInterval: number
  }
}

// Individual race in a schedule with calculated times
export interface ScheduleRace {
  id: string
  race: RaceWithAgeGroups
  level: Level
  startTime: string
  order: number
}

// Rule types with relationships for the extensible rule engine
export type RuleWithConditions = Rule & {
  conditions: RuleCondition[]
  matchings: RuleMatching[]
}

// For creating new rules
export interface CreateRuleData {
  name: string
  description?: string
  minIntervalMinutes: number
  conditions: {
    conditionSet: 'A' | 'B'
    field: string
    operator: string
    value: string
  }[]
  matchings: {
    field: string
  }[]
}

// For rule evaluation and conflict detection
export interface RuleViolation {
  rule: RuleWithConditions
  race1: RaceWithAgeGroups
  race2: RaceWithAgeGroups
  actualIntervalMinutes: number
  requiredIntervalMinutes: number
  message: string
  severity: 'warning' | 'error' | 'info'
  violationHash: string // Unique identifier for dismissal tracking
}

// Utility function type for calculating display times
export type CalculateStartTimeFunction = (
  sectionStartTime: string,
  itemOrderIndex: number,
  allItemsInSection: ScheduleItem[]
) => string

// For parsing Excel data in service tunnel  
export interface RawRaceData {
  'Versenyszám neve': string
  'Versenyszám szakág': string
  'Hajóosztály': string
  'Versenyszám nem': string
  'Versenyszám évfolyamok': string
  'Versenyszám táv': string
  'Előfordulás': number
}