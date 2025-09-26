/**
 * HTTP Client Service for Spring Boot Backend
 * Replaces Prisma client calls with REST API requests during migration
 */
import { 
  Level,
  AgeGroup,
  Schedule,
  ScheduleSection,
  ScheduleItem,
  ScheduleWithSections,
  ScheduleItemWithRace,
  ScheduleItemWithRaceAndSection,
  CreateScheduleSectionData,
  RaceWithAgeGroupsAndBoatClass,
  PDFProcessingResult,
  ExtractedRace,
  RaceWithCompetitorData,
  PDFExtraction,
  RuleWithConditions,
  CreateRuleData,
  CompetitorSchedule,
  CompetitorRaceDetails,
  CompetitorRacePairDetails,
  ScheduleRace
} from '../../../shared/types/race'
import { backendService } from '../../features/common/services/BackendService'

// Type for database statistics
export interface DatabaseStats {
  races: number
  ageGroups: number
  schedules: number
}

// Type for schedule statistics
export interface ScheduleStatistics {
  totalSections: number
  totalRaces: number
  totalDurationMinutes: number
  averageRacesPerSection: number
  hasPDFData: boolean
  uniqueRaceTypes: number
  mostCommonInterval: number
}

// Minimal types needed for backend API that aren't already defined in shared types
export interface ProcessedVersenyszam {
  nev: string
  hajoosztaly?: string
  nem?: string
  korosztaly?: string
  tav?: string
  nevezettek?: Array<{
    id: string
    nev: string
    tagszervezet?: string
    szuletesiEv?: number
  }>
  [key: string]: any
}

export interface PDFExtractionStats {
  filename: string
  totalRaces: number
  matchedRaces: number
  totalCompetitors: number
  totalEntries: number
  createdAt: string
}

export interface PDFCleanupResult {
  deletedExtractions: number
  deletedRecords: number
}

export interface PDFDeletionResult {
  success: boolean
  error?: string
}

// Type for rule statistics
export interface RuleStats {
  totalRules: number
  activeRules: number
  inactiveRules: number
}

// Configuration constants for maintainability
export class BackendConfig {
  static readonly REQUEST_TIMEOUT = 120000 // 120 seconds
  
  // Get dynamic base URL from backend service
  static getBaseUrl(): string {
    return backendService.getBaseUrl()
  }
  
  // API Endpoints
  static readonly ENDPOINTS = {
    LEVELS: '/levels',
    RACES: '/races', 
    SCHEDULES: '/schedules',
    RULES: '/rules',
    COMPETITORS: '/competitors',
    PDF: '/pdf',
    BOAT_CLASSES: '/boat-classes'
  } as const
}

/**
 * Generic HTTP client for backend communication
 * Handles common concerns like error handling, timeouts, and response parsing
 */
export class BackendAPIService {
  
  /**
   * Generic HTTP request handler with error handling
   */
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure backend service is ready before making requests
    await backendService.ensureReady()
    
    const url = `${BackendConfig.getBaseUrl()}${endpoint}`
    
    // Set default headers and timeout
    const requestOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(BackendConfig.REQUEST_TIMEOUT),
      ...options,
    }

    try {
      console.log(`🌐 Backend API: ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Handle void responses (like PUT/DELETE that return 204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        console.log(`✅ Backend API Response: No Content (${response.status})`)
        return undefined as T
      }

      // Parse JSON response for non-void responses
      const data = await response.json()
      console.log(`✅ Backend API Response: ${JSON.stringify(data).substring(0, 100)}...`)

      return data as T
      
    } catch (error) {
      console.error(`❌ Backend API Error for ${url}:`, error)
      throw new Error(`Backend API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * GET request helper
   */
  private static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  /**
   * POST request helper
   */
  private static async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request helper
   */
  private static async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request helper
   */
  private static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // ========================
  // LEVEL SERVICE METHODS
  // ========================

  /**
   * Get all levels ordered by sort order
   * Replaces: LevelService.getAllLevels()
   * Endpoint: GET /api/levels
   */
  static async getAllLevels(): Promise<Level[]> {
    return this.get<Level[]>(BackendConfig.ENDPOINTS.LEVELS)
  }

  /**
   * Get the default level (Döntő I.)
   * Replaces: LevelService.getDefaultLevel()
   * Endpoint: GET /api/levels/default
   */
  static async getDefaultLevel(): Promise<Level> {
    return this.get<Level>(`${BackendConfig.ENDPOINTS.LEVELS}/default`)
  }

  /**
   * Get level by ID
   * Replaces: LevelService.getLevelById()
   * Endpoint: GET /api/levels/{id}
   * Note: Currently dead code but keeping for completeness
   */
  static async getLevelById(id: number): Promise<Level | null> {
    try {
      return await this.get<Level>(`${BackendConfig.ENDPOINTS.LEVELS}/${id}`)
    } catch (error) {
      // Backend returns 404 for not found, we return null to match Prisma behavior
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Get levels by type
   * Replaces: LevelService.getLevelsByType()
   * Endpoint: GET /api/levels?type={levelType}
   * Note: Currently dead code but keeping for completeness
   */
  static async getLevelsByType(levelType: string): Promise<Level[]> {
    return this.get<Level[]>(`${BackendConfig.ENDPOINTS.LEVELS}?type=${encodeURIComponent(levelType)}`)
  }

  // ========================
  // SCHEDULE SERVICE METHODS
  // ========================

  /**
   * Get all schedules ordered by creation date
   * Replaces: ScheduleService.getAllSchedules()
   * Endpoint: GET /api/schedules
   */
  static async getAllSchedules(): Promise<Schedule[]> {
    return this.get<Schedule[]>(BackendConfig.ENDPOINTS.SCHEDULES)
  }

  /**
   * Create a new schedule
   * Replaces: ScheduleService.createSchedule()
   * Endpoint: POST /api/schedules
   */
  static async createSchedule(name: string): Promise<number> {
    return this.post<number>(BackendConfig.ENDPOINTS.SCHEDULES, { name })
  }

  /**
   * Get schedule items for a specific schedule (legacy method)
   * Replaces: ScheduleService.getScheduleItems()
   * Endpoint: GET /api/schedules/{id}/items
   */
  static async getScheduleItems(scheduleId: number): Promise<ScheduleItemWithRaceAndSection[]> {
    return this.get<ScheduleItemWithRaceAndSection[]>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/items`)
  }

  static async getAllSeatCounts(): Promise<string[]> {
    return this.get<string[]>(`${BackendConfig.ENDPOINTS.BOAT_CLASSES}/seat-counts`)
  }

  static async getAllBoatTypes(): Promise<string[]> {
    return this.get<string[]>(`${BackendConfig.ENDPOINTS.BOAT_CLASSES}/types`)
  }

  /**
   * Create a schedule item
   * Replaces: ScheduleService.createScheduleItem()
   * Endpoint: POST /api/schedules/{id}/sections/{sectionId}/items
   */
  static async createScheduleItem(
    scheduleId: number,
    sectionId: number,
    raceId: number,
    levelId: number,
    orderIndex: number, 
    intervalMinutes: number = 0,
    notes?: string
  ): Promise<number> {
    const payload = {
      raceId,
      levelId,
      orderIndex,
      intervalMinutes,
      notes
    }
    return this.post<number>(
      `${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/sections/${sectionId}/items`,
      payload
    )
  }

  /**
   * Save schedule with sections and items (transaction)
   * Replaces: ScheduleService.saveScheduleWithSections()
   * Endpoint: POST /api/schedules/with-sections
   */
  static async saveScheduleWithSections(
    name: string,
    sectionsData: Array<{
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
    }>,
    pdfExtractionId?: number
  ): Promise<number> {
    const payload = {
      name,
      sectionsData,
      pdfExtractionId
    }
    return this.post<number>(`${BackendConfig.ENDPOINTS.SCHEDULES}/with-sections`, payload)
  }

  /**
   * Update existing schedule with sections and items (transaction)
   * Replaces: ScheduleService.updateScheduleWithSections()
   * Endpoint: PUT /api/schedules/{id}/with-sections
   */
  static async updateScheduleWithSections(
    scheduleId: number,
    name: string,
    sectionsData: Array<{
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
    }>,
    pdfExtractionId?: number
  ): Promise<number> {
    const payload = {
      name,
      sectionsData,
      pdfExtractionId
    }
    return this.put<number>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/with-sections`, payload)
  }

  /**
   * Create a schedule section
   * Replaces: ScheduleService.createScheduleSection()
   * Endpoint: POST /api/schedules/{scheduleId}/sections
   */
  static async createScheduleSection(data: CreateScheduleSectionData): Promise<number> {
    // The backend controller expects scheduleId in the URL path, not in the body
    const { scheduleId, ...sectionData } = data
    return this.post<number>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/sections`, sectionData)
  }

  /**
   * Get all sections for a schedule
   * Replaces: ScheduleService.getScheduleSections()
   * Endpoint: GET /api/schedules/{id}/sections
   */
  static async getScheduleSections(scheduleId: number): Promise<ScheduleSection[]> {
    return this.get<ScheduleSection[]>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/sections`)
  }

  /**
   * Get schedule items by section with calculated start times
   * Replaces: ScheduleService.getScheduleItemsBySection()
   * Endpoint: GET /api/schedules/sections/{sectionId}/items
   */
  static async getScheduleItemsBySection(sectionId: number): Promise<ScheduleItemWithRaceAndSection[]> {
    return this.get<ScheduleItemWithRaceAndSection[]>(`${BackendConfig.ENDPOINTS.SCHEDULES}/sections/${sectionId}/items`)
  }

  /**
   * Get schedule with all its sections, schedule items, and PDF data if linked
   * Replaces: ScheduleService.getScheduleWithSections()
   * Endpoint: GET /api/schedules/{id}/with-sections
   */
  static async getScheduleWithSections(scheduleId: number): Promise<ScheduleWithSections | null> {
    try {
      return await this.get<ScheduleWithSections>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/with-sections`)
    } catch (error) {
      // Backend returns 404 for not found, we return null to match Prisma behavior
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Get schedule with PDF context restored for competitor-aware features
   * Replaces: ScheduleService.getScheduleWithPDFContext()
   * Endpoint: GET /api/schedules/{id}/pdf-context
   */
  static async getScheduleWithPDFContext(scheduleId: number): Promise<{
    schedule: ScheduleWithSections | null
    pdfExtractionId?: number
    hasPDFData: boolean
  }> {
    try {
      return await this.get<{
        schedule: ScheduleWithSections | null
        pdfExtractionId?: number
        hasPDFData: boolean
      }>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/pdf-context`)
    } catch (error) {
      // Backend returns 404 for not found, we return null schedule to match Prisma behavior
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return { schedule: null, hasPDFData: false }
      }
      throw error
    }
  }

  /**
   * Delete a schedule and all its associated data
   * Replaces: ScheduleService.deleteSchedule()
   * Endpoint: DELETE /api/schedules/{id}
   */
  static async deleteSchedule(scheduleId: number): Promise<void> {
    await this.delete<void>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}`)
  }

  /**
   * Update schedule name
   * Endpoint: PUT /api/schedules/{id}/name
   */
  static async renameSchedule(scheduleId: number, newName: string): Promise<void> {
    await this.put<void>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/name`, { name: newName })
  }

  /**
   * Get schedule statistics
   * Endpoint: GET /api/schedules/{id}/statistics
   */
  static async getScheduleStatistics(scheduleId: number): Promise<ScheduleStatistics> {
    return this.get<ScheduleStatistics>(`${BackendConfig.ENDPOINTS.SCHEDULES}/${scheduleId}/statistics`)
  }

  // ========================
  // RACE SERVICE METHODS
  // ========================

  /**
   * Get all races with their age groups, ordered by occurrence and name
   * Replaces: RaceService.getAllRaces()
   * Endpoint: GET /api/races
   */
  static async getAllRaces(): Promise<RaceWithAgeGroupsAndBoatClass[]> {
    return this.get<RaceWithAgeGroupsAndBoatClass[]>(BackendConfig.ENDPOINTS.RACES)
  }

  /**
   * Search races by term across multiple fields
   * Replaces: RaceService.searchRaces()
   * Endpoint: GET /api/races/search?term={searchTerm}
   */
  static async searchRaces(searchTerm: string): Promise<RaceWithAgeGroupsAndBoatClass[]> {
    return this.get<RaceWithAgeGroupsAndBoatClass[]>(`${BackendConfig.ENDPOINTS.RACES}/search?term=${encodeURIComponent(searchTerm)}`)
  }

  /**
   * Update race visibility (hidden status)
   * Replaces: RaceService.updateRaceHidden()
   * Endpoint: PUT /api/races/{id}/hidden?hidden={boolean}
   */
  static async updateRaceHidden(raceId: number, hidden: boolean): Promise<boolean> {
    try {
      await this.request<void>(`${BackendConfig.ENDPOINTS.RACES}/${raceId}/hidden?hidden=${hidden}`, { 
        method: 'PUT' 
      })
      return true
    } catch (error) {
      console.error('Error updating race hidden status:', error)
      return false
    }
  }

  /**
   * Get all age groups ordered by name
   * Replaces: RaceService.getAllAgeGroups()
   * Endpoint: GET /api/races/age-groups
   */
  static async getAllAgeGroups(): Promise<AgeGroup[]> {
    return this.get<AgeGroup[]>(`${BackendConfig.ENDPOINTS.RACES}/age-groups`)
  }

  /**
   * Get statistics about the database
   * Replaces: RaceService.getStats()
   * Endpoint: GET /api/races/stats
   */
  static async getStats(): Promise<DatabaseStats> {
    return this.get<DatabaseStats>(`${BackendConfig.ENDPOINTS.RACES}/stats`)
  }

  // ========================
  // RACE MATCHING SERVICE METHODS (PDF PROCESSING)
  // ========================

  /**
   * Process PDF extraction result and store competitor data with race matching
   * Replaces: RaceMatchingService.processPDFAndMatch()
   * Endpoint: POST /api/pdf/process-and-match
   */
  static async processPDFAndMatch(
    filename: string,
    pdfData: ProcessedVersenyszam[],
    fileHash?: string
  ): Promise<PDFProcessingResult> {
    const payload = {
      filename,
      pdfData,
      fileHash
    }

    return this.post<PDFProcessingResult>(`${BackendConfig.ENDPOINTS.PDF}/process-and-match`, payload)
  }

  /**
   * Get filtered races with competitor data for a PDF extraction
   * Replaces: RaceMatchingService.getFilteredRaces()
   * Endpoint: GET /api/pdf/extractions/{id}/filtered-races
   */
  static async getFilteredRaces(pdfExtractionId: number): Promise<RaceWithCompetitorData[]> {
    return this.get<RaceWithCompetitorData[]>(`${BackendConfig.ENDPOINTS.PDF}/extractions/${pdfExtractionId}/filtered-races`)
  }

  /**
   * Get competitor data for analysis and rule checking
   * Replaces: RaceMatchingService.getCompetitorData()
   * Endpoint: GET /api/pdf/extractions/{id}/competitor-data
   */
  static async getCompetitorData(pdfExtractionId: number): Promise<Map<string, any>> {
    const competitorData = await this.get<{ [key: string]: any }>(`${BackendConfig.ENDPOINTS.PDF}/extractions/${pdfExtractionId}/competitor-data`)
    // Convert plain object back to Map for compatibility with existing code
    return new Map(Object.entries(competitorData))
  }

  /**
   * Get PDF extraction statistics
   * Replaces: RaceMatchingService.getPDFExtractionStats()
   * Endpoint: GET /api/pdf/extractions/{id}/stats
   */
  static async getPDFExtractionStats(pdfExtractionId: number): Promise<PDFExtractionStats | null> {
    try {
      return await this.get<PDFExtractionStats>(`${BackendConfig.ENDPOINTS.PDF}/extractions/${pdfExtractionId}/stats`)
    } catch (error) {
      // Backend returns 404 for not found, we return null to match TypeScript service behavior
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Link PDF extraction to a schedule (promote from session to permanent)
   * Replaces: RaceMatchingService.linkToSchedule()
   * Endpoint: POST /api/pdf/extractions/{id}/link
   */
  static async linkToSchedule(pdfExtractionId: number): Promise<void> {
    await this.post<void>(`${BackendConfig.ENDPOINTS.PDF}/extractions/${pdfExtractionId}/link`, {})
  }

  /**
   * Clean up expired session data
   * Replaces: RaceMatchingService.cleanupExpiredSessions()
   * Endpoint: POST /api/pdf/cleanup-expired
   */
  static async cleanupExpiredSessions(): Promise<PDFCleanupResult> {
    return this.post<PDFCleanupResult>(`${BackendConfig.ENDPOINTS.PDF}/cleanup-expired`, {})
  }

  /**
   * Get all PDF extractions with metadata for the PDF manager
   * Replaces: RaceMatchingService.getAllPDFExtractions()
   * Endpoint: GET /api/pdf/extractions
   */
  static async getAllPDFExtractions(): Promise<PDFExtraction[]> {
    return this.get<PDFExtraction[]>(`${BackendConfig.ENDPOINTS.PDF}/extractions`)
  }

  /**
   * Delete a PDF extraction and all related data
   * Replaces: RaceMatchingService.deletePDFExtraction()
   * Endpoint: DELETE /api/pdf/extractions/{id}
   */
  static async deletePDFExtraction(pdfExtractionId: number): Promise<PDFDeletionResult> {
    return this.delete<PDFDeletionResult>(`${BackendConfig.ENDPOINTS.PDF}/extractions/${pdfExtractionId}`)
  }

  // ========================
  // RULE SERVICE METHODS
  // ========================

  /**
   * Get all rules with their conditions and matchings
   * Replaces: RuleService.getAllRules()
   * Endpoint: GET /api/rules
   */
  static async getAllRules(): Promise<RuleWithConditions[]> {
    return this.get<RuleWithConditions[]>(BackendConfig.ENDPOINTS.RULES)
  }

  /**
   * Get all active rules only
   * Replaces: RuleService.getActiveRules()
   * Endpoint: GET /api/rules/active
   */
  static async getActiveRules(): Promise<RuleWithConditions[]> {
    return this.get<RuleWithConditions[]>(`${BackendConfig.ENDPOINTS.RULES}/active`)
  }

  /**
   * Get a specific rule by ID with its conditions and matchings
   * Replaces: RuleService.getRuleById()
   * Endpoint: GET /api/rules/{id}
   */
  static async getRuleById(id: number): Promise<RuleWithConditions | null> {
    try {
      return await this.get<RuleWithConditions>(`${BackendConfig.ENDPOINTS.RULES}/${id}`)
    } catch (error) {
      // Backend returns 404 for not found, we return null to match TypeScript service behavior
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Create a new rule with conditions and matchings
   * Replaces: RuleService.createRule()
   * Endpoint: POST /api/rules
   */
  static async createRule(data: CreateRuleData): Promise<RuleWithConditions> {
    return this.post<RuleWithConditions>(BackendConfig.ENDPOINTS.RULES, data)
  }

  /**
   * Update an existing rule
   * Replaces: RuleService.updateRule()
   * Endpoint: PUT /api/rules/{id}
   */
  static async updateRule(id: number, data: Partial<CreateRuleData>): Promise<RuleWithConditions | null> {
    try {
      return await this.put<RuleWithConditions>(`${BackendConfig.ENDPOINTS.RULES}/${id}`, data)
    } catch (error) {
      // Backend returns 404 for not found, we return null to match TypeScript service behavior
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  /**
   * Delete a rule
   * Replaces: RuleService.deleteRule()
   * Endpoint: DELETE /api/rules/{id}
   */
  static async deleteRule(id: number): Promise<boolean> {
    try {
      await this.delete<boolean>(`${BackendConfig.ENDPOINTS.RULES}/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting rule:', error)
      return false
    }
  }

  /**
   * Toggle rule active status
   * Replaces: RuleService.toggleRuleActive()
   * Endpoint: PUT /api/rules/{id}/active?active={boolean}
   */
  static async toggleRuleActive(id: number, isActive: boolean): Promise<boolean> {
    try {
      await this.request<boolean>(`${BackendConfig.ENDPOINTS.RULES}/${id}/active?active=${isActive}`, {
        method: 'PUT'
      })
      return true
    } catch (error) {
      console.error('Error toggling rule active status:', error)
      return false
    }
  }

  /**
   * Get rule statistics
   * Replaces: RuleService.getRuleStats()
   * Endpoint: GET /api/rules/stats
   */
  static async getRuleStats(): Promise<RuleStats> {
    return this.get<RuleStats>(`${BackendConfig.ENDPOINTS.RULES}/stats`)
  }

  /**
   * Search rules by name or description
   * Replaces: RuleService.searchRules()
   * Endpoint: GET /api/rules/search?term={searchTerm}
   */
  static async searchRules(searchTerm: string): Promise<RuleWithConditions[]> {
    return this.get<RuleWithConditions[]>(`${BackendConfig.ENDPOINTS.RULES}/search?term=${encodeURIComponent(searchTerm)}`)
  }

  /**
   * Dismiss a rule violation for a specific schedule
   * Replaces: RuleService.dismissViolation()
   * Endpoint: POST /api/rules/violations/dismiss
   */
  static async dismissViolation(scheduleId: number, violationHash: string): Promise<boolean> {
    try {
      await this.post<boolean>(`${BackendConfig.ENDPOINTS.RULES}/violations/dismiss`, {
        scheduleId,
        violationHash
      })
      return true
    } catch (error) {
      console.error('Error dismissing violation:', error)
      return false
    }
  }

  /**
   * Get all dismissed violations for a schedule
   * Replaces: RuleService.getDismissedViolations()
   * Endpoint: GET /api/rules/violations/dismissed?scheduleId={scheduleId}
   */
  static async getDismissedViolations(scheduleId: number): Promise<string[]> {
    try {
      return await this.get<string[]>(`${BackendConfig.ENDPOINTS.RULES}/violations/dismissed?scheduleId=${scheduleId}`)
    } catch (error) {
      console.error('Error getting dismissed violations:', error)
      return []
    }
  }

  /**
   * Remove a dismissed violation (if user wants to see it again)
   * Replaces: RuleService.undismissViolation()
   * Endpoint: DELETE /api/rules/violations/dismiss
   */
  static async undismissViolation(scheduleId: number, violationHash: string): Promise<boolean> {
    try {
      await this.request<boolean>(`${BackendConfig.ENDPOINTS.RULES}/violations/dismiss`, {
        method: 'DELETE',
        body: JSON.stringify({
          scheduleId,
          violationHash
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return true
    } catch (error) {
      console.error('Error undismissing violation:', error)
      return false
    }
  }

  /**
   * Clear all dismissed violations for a schedule
   * Replaces: RuleService.clearDismissedViolations()
   * Endpoint: DELETE /api/rules/violations/dismissed?scheduleId={scheduleId}
   */
  static async clearDismissedViolations(scheduleId: number): Promise<boolean> {
    try {
      await this.delete<boolean>(`${BackendConfig.ENDPOINTS.RULES}/violations/dismissed?scheduleId=${scheduleId}`)
      return true
    } catch (error) {
      console.error('Error clearing dismissed violations:', error)
      return false
    }
  }

  /**
   * Get count of dismissed violations for a schedule
   * Replaces: RuleService.getDismissedViolationCount()
   * Endpoint: GET /api/rules/violations/dismissed/count?scheduleId={scheduleId}
   */
  static async getDismissedViolationCount(scheduleId: number): Promise<number> {
    try {
      return await this.get<number>(`${BackendConfig.ENDPOINTS.RULES}/violations/dismissed/count?scheduleId=${scheduleId}`)
    } catch (error) {
      console.error('Error getting dismissed violation count:', error)
      return 0
    }
  }

  /**
   * Clean up dismissed violations that no longer apply
   * Replaces: RuleService.cleanupDismissedViolations()
   * Endpoint: POST /api/rules/violations/cleanup
   */
  static async cleanupDismissedViolations(scheduleId: number, currentViolationHashes: string[]): Promise<boolean> {
    try {
      await this.post<boolean>(`${BackendConfig.ENDPOINTS.RULES}/violations/cleanup`, {
        scheduleId,
        currentViolationHashes
      })
      return true
    } catch (error) {
      console.error('Error cleaning up dismissed violations:', error)
      return false
    }
  }

  // =================== COMPETITOR SERVICE METHODS ===================

  /**
   * Analyze competitor schedules from a set of schedule races
   * Replaces: CompetitorService.analyzeCompetitorSchedules()
   * Endpoint: POST /api/competitors/analyze
   */
  static async analyzeCompetitorSchedules(scheduleRaces: ScheduleRace[], pdfExtractionId?: number): Promise<CompetitorSchedule[]> {
    try {
      return await this.post<CompetitorSchedule[]>(`${BackendConfig.ENDPOINTS.COMPETITORS}/analyze`, {
        scheduleRaces,
        pdfExtractionId
      })
    } catch (error) {
      console.error('Error analyzing competitor schedules:', error)
      return []
    }
  }

  /**
   * Check for competitor conflicts between two specific races  
   * Replaces: CompetitorService.checkCompetitorConflicts()
   * Endpoint: GET /api/competitors/conflicts
   */
  static async checkCompetitorConflicts(
    race1Id: number, 
    race2Id: number, 
    pdfExtractionId?: number
  ): Promise<{
    hasConflicts: boolean
    conflictingCompetitors: string[]
    competitorCount: number
  }> {
    try {
      const params = new URLSearchParams({
        race1Id: race1Id.toString(),
        race2Id: race2Id.toString()
      })
      if (pdfExtractionId) {
        params.append('pdfExtractionId', pdfExtractionId.toString())
      }
      
      return await this.get<{
        hasConflicts: boolean
        conflictingCompetitors: string[]
        competitorCount: number
      }>(`${BackendConfig.ENDPOINTS.COMPETITORS}/conflicts?${params.toString()}`)
    } catch (error) {
      console.error('Error checking competitor conflicts:', error)
      return { hasConflicts: false, conflictingCompetitors: [], competitorCount: 0 }
    }
  }

  /**
   * Get competitor summary for a race
   * Replaces: CompetitorService.getRaceCompetitorSummary()
   * Endpoint: GET /api/competitors/races/{raceId}/summary
   */
  static async getRaceCompetitorSummary(
    raceId: number, 
    pdfExtractionId?: number
  ): Promise<{
    entryCount: number
    topCompetitors: string[]
    organizations: string[]
  }> {
    try {
      const params = new URLSearchParams()
      if (pdfExtractionId) {
        params.append('pdfExtractionId', pdfExtractionId.toString())
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : ''
      return await this.get<{
        entryCount: number
        topCompetitors: string[]
        organizations: string[]
      }>(`${BackendConfig.ENDPOINTS.COMPETITORS}/races/${raceId}/summary${queryString}`)
    } catch (error) {
      console.error('Error getting race competitor summary:', error)
      return { entryCount: 0, topCompetitors: [], organizations: [] }
    }
  }

  /**
   * Get competitors at high risk (tight schedules)
   * Replaces: CompetitorService.getHighRiskCompetitors()
   * Endpoint: GET /api/competitors/high-risk
   */
  static async getHighRiskCompetitors(pdfExtractionId: number): Promise<CompetitorSchedule[]> {
    try {
      return await this.get<CompetitorSchedule[]>(`${BackendConfig.ENDPOINTS.COMPETITORS}/high-risk?pdfExtractionId=${pdfExtractionId}`)
    } catch (error) {
      console.error('Error getting high risk competitors:', error)
      return []
    }
  }

  /**
   * Get competitor entry statistics for a PDF extraction
   * Replaces: CompetitorService.getCompetitorStats()
   * Endpoint: GET /api/competitors/stats
   */
  static async getCompetitorStats(pdfExtractionId: number): Promise<{
    totalCompetitors: number
    totalEntries: number
    racesWithEntries: number
    organizationsRepresented: number
  }> {
    try {
      return await this.get<{
        totalCompetitors: number
        totalEntries: number
        racesWithEntries: number
        organizationsRepresented: number
      }>(`${BackendConfig.ENDPOINTS.COMPETITORS}/stats?pdfExtractionId=${pdfExtractionId}`)
    } catch (error) {
      console.error('Error getting competitor stats:', error)
      return {
        totalCompetitors: 0,
        totalEntries: 0,
        racesWithEntries: 0,
        organizationsRepresented: 0
      }
    }
  }
}