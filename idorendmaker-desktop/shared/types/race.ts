// Native TypeScript interfaces - migrated from Prisma for independent type system
export interface Race {
  code: string // String code identifier (was id: number)
  name: string
  discipline: string // 'Kajak', 'Kenu', 'SUP', 'Kajakpóló', 'Parakenu', 'Sárkányhajó', 'Szlalom', 'Tengeri kajak'
  boatClassCode: string // Reference to boat_classes by code
  gender: string // 'Férfi', 'Női', 'Vegyes'
  distance: string
  sortOrder: number // For ordering (was occurrence)
  hidden: boolean // User can hide races they don't organize
}

export interface AgeGroup {
  code: string // String code identifier (was id: number)
  name: string // e.g., "Serdülő - U15", "Serdülő - U16"
  sortOrder: number // For ordering
}

export interface BoatClass {
  code: string // String code identifier (was id: number)
  name: string // e.g., "Kajak egyes", "Kajak páros"
  boatTypeCode: string // e.g., "Kajak", "Minikajak", "Kenu" (was boatType)
  seatCount: number | null // e.g., 1, 2, 4, 20, null for "csapat"
  seatCountText: string // e.g., "1", "2", "4", "20", "csapat"
}

export interface Level {
  code: string // String code identifier (was id: number)
  name: string // e.g., "A Döntő", "I. Előfutam", "Döntő I."
  levelType: string // "döntő", "előfutam", "középfutam"
  sortOrder: number // For UI display ordering
  isDefault: boolean // Mark "Döntő I." as default
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
  raceCode: string // Reference to race by string code (was raceId: number)
  levelCode: string // Reference to level by string code (was levelId: number)
  raceName: string // Denormalized snapshot
  raceDiscipline: string // Denormalized snapshot
  raceBoatClassName: string // Denormalized snapshot
  raceGender: string // Denormalized snapshot
  raceDistance: string // Denormalized snapshot
  raceAgeGroupsDisplay: string // Denormalized snapshot - comma-separated age group names
  levelName: string // Denormalized snapshot
  levelType: string // Denormalized snapshot
  orderIndex: number
  intervalMinutes: number // Break time AFTER this race
  notes: string | null
  createdAt: string // ISO date string from backend
  calculatedStartTime: string // Backend-computed start time
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
  violationHash: string // Unique identifier: ruleId-race1Code-race1StartTime-race2Code-race2StartTime
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
  raceCode: string // Database race code (matched) - was raceId: number
  competitorId: string // From PDF
  pdfRaceName: string // Original race name from PDF
  matchConfidence: number // 0.0 to 1.0 confidence score
  createdAt: string // ISO date string from backend
}

// Enhanced types with relationships (using the native interfaces above)

export type RaceWithAgeGroupsAndBoatClass = Race & {
  ageGroups: AgeGroup[]
  // Note: boat class info is now just boatClassCode on Race - no more nested boatClassData
}

// Enhanced types for PDF processing and competitor data
export type PDFExtractionWithDetails = PDFExtraction & {
  competitorEntries: CompetitorEntry[]
  raceCompetitorAssociations: RaceCompetitorAssociation[]
}

export type RaceWithCompetitorData = RaceWithAgeGroupsAndBoatClass & {
  entryCount: number
  competitorIds: string[]
  topCompetitors: string[] // Sample of competitor names (first 3)
  pdfExtractionId?: number
  boatClassSeatCount?: number | null // Seat count from boat class for boat unit calculation
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
  raceCode: string
  raceName: string
  scheduledTime: string
  estimatedDuration: number
  intervalToNext?: number
  recoveryTime?: number
  conflictLevel: 'none' | 'warning' | 'critical'
}

// New type for race pair analysis - matches CompetitorRacePairDetailsDto from backend
export type CompetitorRacePairDetails = {
  race1Code: string
  levelType1: string
  level1Code: string
  race1Name: string
  race1StartTime: string
  race2Code: string | null
  levelType2: string | null
  level2Code: string | null
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
  matchedDatabaseRaceCode?: string // was matchedDatabaseRaceId?: number
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

// ScheduleItemWithRace is now just ScheduleItem itself - all display data is flat on the item
// No more nested race/level objects. Use item.raceName, item.levelName, etc.
export type ScheduleItemWithRace = ScheduleItem

export type ScheduleItemWithRaceAndSection = ScheduleItem & {
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
  boatClassCode: string
  gender: 'Férfi' | 'Női' | 'Vegyes'
  distance: string
  sortOrder?: number
  hidden?: boolean
  ageGroupCodes: string[]
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
  raceCode: string // Reference to race by string code (was raceId: number)
  levelCode: string // Reference to level by string code (was levelId: number)
  orderIndex: number
  intervalMinutes: number
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
  day: number
}

// Individual race in a schedule with calculated times
export interface ScheduleRace {
  id: string
  race: RaceWithAgeGroupsAndBoatClass
  level: Level
  day: number
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
  race1: RaceWithAgeGroupsAndBoatClass
  race2: RaceWithAgeGroupsAndBoatClass
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