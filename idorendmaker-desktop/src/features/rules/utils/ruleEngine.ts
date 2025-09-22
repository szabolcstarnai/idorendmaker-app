import { c } from 'vite/dist/node/types.d-aGj9QkWt'
import { RuleWithConditions, RuleCondition, RuleViolation, ScheduleRace } from '../../../../shared/types/race'

/**
 * Utility class for evaluating rule conditions against races
 */
export class ConditionEvaluator {
  /**
   * Check if a schedule race matches a set of conditions (all conditions must match)
   */
  static matchesConditionSet(scheduleRace: ScheduleRace, conditions: RuleCondition[]): boolean {
    console.log('Evaluating conditions for schedule race:', scheduleRace.id)
    console.log('Conditions:', conditions)
    return conditions.every(condition => this.matchesCondition(scheduleRace, condition))
  }

  /**
   * Check if a schedule race matches a single condition
   */
  static matchesCondition(scheduleRace: ScheduleRace, condition: RuleCondition): boolean {
    console.log('Evaluating condition for schedule race:', scheduleRace)
    console.log('Condition:', condition)
    const fieldValue = this.getFieldValue(scheduleRace, condition.field)
    console.log(`Field value for "${condition.field}":`, fieldValue)

    if (fieldValue === null || fieldValue === undefined) {
      return false
    }

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      
      case 'not_equals':
        return fieldValue !== condition.value
      
      case 'in':
        // For "in" operator, value should be semicolon-separated list (avoiding comma conflicts with decimal numbers)
        return condition.value.split(';').map(v => v.trim()).includes(fieldValue)
      
      case 'not_in':
        // For "not_in" operator, value should be semicolon-separated list (avoiding comma conflicts with decimal numbers)
        return !condition.value.split(';').map(v => v.trim()).includes(fieldValue)
      
      default:
        console.warn(`Unknown operator: ${condition.operator}`)
        return false
    }
  }

  /**
   * Get field value from schedule race based on field name
   */
  private static getFieldValue(scheduleRace: ScheduleRace, field: string): string | null {
    const race = scheduleRace.race;
    
    switch (field) {
      case 'discipline':
        return race.discipline
      
      case 'boatClass':
        return race.boatClass
      
      case 'gender':
        return race.gender
      
      case 'distance':
        return race.distance
      
      case 'name':
        return race.name
      
      case 'ageGroups':
        // For age groups, we'll check if ANY of the race's age groups match
        // This returns a concatenated string for contains/equals operations
        return race.ageGroups.map(ag => ag.name).join(', ')
      
      case 'level':
        return scheduleRace.level.name
      
      case 'levelType':
        return scheduleRace.level.levelType

      case 'boatType':
        // Get boat type from boat class metadata for enhanced rule system
        return race.boatClassData?.boatType || null

      case 'seatCount':
        // Get seat count text from boat class metadata for enhanced rule system
        return race.boatClassData?.seatCountText || null

      default:
        console.warn(`Unknown field: ${field}`)
        return null
    }
  }
}

/**
 * Utility class for checking matching requirements between two races
 */
export class MatchingEvaluator {
  /**
   * Check if two schedule races meet all matching requirements
   */
  static meetMatchingRequirements(scheduleRace1: ScheduleRace, scheduleRace2: ScheduleRace, matchingFields: string[]): boolean {
    return matchingFields.every(field => this.fieldsMatch(scheduleRace1, scheduleRace2, field))
  }

  /**
   * Check if a specific field matches between two schedule races
   */
  static fieldsMatch(scheduleRace1: ScheduleRace, scheduleRace2: ScheduleRace, field: string): boolean {
    const value1 = this.getFieldValue(scheduleRace1, field)
    const value2 = this.getFieldValue(scheduleRace2, field)
    
    if (field === 'ageGroups') {
      // For age groups, check if there's any overlap
      const ageGroups1 = scheduleRace1.race.ageGroups.map(ag => ag.name)
      const ageGroups2 = scheduleRace2.race.ageGroups.map(ag => ag.name)
      return ageGroups1.some(ag1 => ageGroups2.includes(ag1))
    }
    
    if (field === 'baseRaceId') {
      // For baseRaceId, check if the base race ID matches (same race, different levels)
      return scheduleRace1.race.id === scheduleRace2.race.id
    }
    
    return value1 === value2
  }

  /**
   * Get field value from schedule race for matching comparison
   */
  private static getFieldValue(scheduleRace: ScheduleRace, field: string): string | null {
    const race = scheduleRace.race;
    switch (field) {
      case 'discipline':
        return race.discipline
      
      case 'boatClass':
        return race.boatClass
      
      case 'gender':
        return race.gender
      
      case 'distance':
        return race.distance
      
      case 'name':
        return race.name
      
      case 'ageGroups':
        // Return null here - age groups are handled specially above
        return null
      
      case 'level':
        return scheduleRace.level.name
      
      case 'levelType':
        return scheduleRace.level.levelType

      case 'boatType':
        // Get boat type from boat class metadata for enhanced rule system
        return race.boatClassData?.boatType || null

      case 'seatCount':
        // Get seat count text from boat class metadata for enhanced rule system
        return race.boatClassData?.seatCountText || null

      case 'baseRaceId':
        // Return null here - baseRaceId is handled specially above
        return null

      default:
        console.warn(`Unknown field for matching: ${field}`)
        return null
    }
  }
}

/**
 * Core rule processing engine
 */
export class RuleProcessor {
  /**
   * Check a schedule against all rules and return violations
   */
  static async checkScheduleViolations(scheduleRaces: ScheduleRace[], rules: RuleWithConditions[]): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []
    
    for (const rule of rules) {
      if (!rule.isActive) continue
      
      const ruleViolations = this.checkRuleAgainstSchedule(rule, scheduleRaces)
      violations.push(...ruleViolations)
    }
    
    return violations
  }

  /**
   * Check a single rule against a schedule
   */
  static checkRuleAgainstSchedule(rule: RuleWithConditions, scheduleRaces: ScheduleRace[]): RuleViolation[] {
    const violations: RuleViolation[] = []
    
    // Get conditions for each set
    const conditionsA = rule.conditions.filter(c => c.conditionSet === 'A')
    const conditionsB = rule.conditions.filter(c => c.conditionSet === 'B')
    
    // If no conditions for either set, skip this rule
    if (conditionsA.length === 0 || conditionsB.length === 0) {
      console.warn(`Rule "${rule.name}" is missing conditions for set A or B`)
      return violations
    }

    // Find races matching each condition set
    const racesA = scheduleRaces.filter(sr => 
      ConditionEvaluator.matchesConditionSet(sr, conditionsA)
    )
    const racesB = scheduleRaces.filter(sr => 
      ConditionEvaluator.matchesConditionSet(sr, conditionsB)
    )

    // Get matching field names
    const matchingFields = rule.matchings.map(m => m.field)

    // Check all pairs for violations
    for (const raceA of racesA) {
      for (const raceB of racesB) {
        // Don't compare a race with itself
        if (raceA.id === raceB.id) continue
        
        // Check if matching requirements are met
        if (!MatchingEvaluator.meetMatchingRequirements(raceA, raceB, matchingFields)) {
          continue
        }

        // Calculate time difference in minutes
        const timeA = this.parseTime(raceA.startTime)
        const timeB = this.parseTime(raceB.startTime)
        const timeDiffMinutes = Math.abs(timeB - timeA)

        // Check if violation occurs
        if (timeDiffMinutes < rule.minIntervalMinutes) {
          const violationHash = this.generateViolationHash(rule.id, raceA, raceB)
          violations.push({
            rule,
            race1: raceA.race,
            race2: raceB.race,
            actualIntervalMinutes: timeDiffMinutes,
            requiredIntervalMinutes: rule.minIntervalMinutes,
            message: this.generateViolationMessage(rule, raceA, raceB, timeDiffMinutes),
            severity: timeDiffMinutes === 0 ? 'error' : 'warning',
            violationHash
          })
        }
      }
    }

    return violations
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Generate unique hash for violation dismissal tracking
   * Format: ruleId-race1Id-race1StartTime-race2Id-race2StartTime
   */
  private static generateViolationHash(ruleId: number, raceA: ScheduleRace, raceB: ScheduleRace): string {
    return `${ruleId}-${raceA.race.id}-${raceA.startTime}-${raceB.race.id}-${raceB.startTime}`
  }

  /**
   * Generate a descriptive violation message
   */
  private static generateViolationMessage(
    rule: RuleWithConditions, 
    scheduleRace1: ScheduleRace, 
    scheduleRace2: ScheduleRace, 
    actualMinutes: number
  ): string {
    const formatRaceNameWithLevel = (scheduleRace: ScheduleRace) => {
      // Include level information for clarity
      const baseName = scheduleRace.race.name || `${scheduleRace.race.boatClass} ${scheduleRace.race.gender} ${scheduleRace.race.distance}`.trim()
      return `${baseName} (${scheduleRace.level.name})`
    }

    const race1Name = formatRaceNameWithLevel(scheduleRace1)
    const race2Name = formatRaceNameWithLevel(scheduleRace2)
    
    if (actualMinutes === 0) {
      return `"${race1Name}" és "${race2Name}" ugyanabban az időpontban van ütemezve. Szabály: "${rule.name}" - minimum ${rule.minIntervalMinutes} perc szükséges.`
    } else {
      return `"${race1Name}" és "${race2Name}" között csak ${actualMinutes} perc van, a minimum ${rule.minIntervalMinutes} helyett. Szabály: "${rule.name}"`
    }
  }
}

/**
 * Competitor-aware rule processing engine
 */
export class CompetitorAwareRuleProcessor {
  /**
   * Check schedule violations with competitor overlap analysis
   */
  static async checkScheduleViolationsWithCompetitors(
    scheduleRaces: ScheduleRace[], 
    rules: RuleWithConditions[], 
    pdfExtractionId: number
  ): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []
    
    for (const rule of rules) {
      if (!rule.isActive) continue
      
      const ruleViolations = await this.checkRuleAgainstScheduleWithCompetitors(rule, scheduleRaces, pdfExtractionId)
      violations.push(...ruleViolations)
    }
    
    // Sort by priority: competitor conflicts first, then rule-only conflicts
    return violations.sort((a, b) => {
      const aPriority = this.getViolationPriority(a)
      const bPriority = this.getViolationPriority(b)
      return bPriority - aPriority // Higher priority first
    })
  }

  /**
   * Check a single rule with competitor awareness
   */
  static async checkRuleAgainstScheduleWithCompetitors(
    rule: RuleWithConditions, 
    scheduleRaces: ScheduleRace[], 
    pdfExtractionId: number
  ): Promise<RuleViolation[]> {
    // First get traditional rule violations
    const baseViolations = RuleProcessor.checkRuleAgainstSchedule(rule, scheduleRaces)
    
    // Enhance violations with competitor information
    const enhancedViolations: RuleViolation[] = []
    
    for (const violation of baseViolations) {
      try {
        // Check for competitor conflicts between the two races
        const competitorConflict = await window.electronAPI.competitorCheckConflicts(
          violation.race1.id,
          violation.race2.id,
          pdfExtractionId
        )

        // Create enhanced violation with competitor context
        const enhancedViolation = {
          ...violation,
          competitorOverlap: competitorConflict.hasConflicts,
          conflictingCompetitors: competitorConflict.conflictingCompetitors,
          competitorCount: competitorConflict.competitorCount
        }

        // Adjust message and severity based on competitor overlap
        if (competitorConflict.hasConflicts) {
          // CRITICAL: Rule violation + actual competitor conflicts
          enhancedViolation.severity = 'error' as const
          enhancedViolation.message = this.generateCompetitorAwareMessage(
            rule, 
            violation, 
            competitorConflict.conflictingCompetitors,
            'critical'
          )
        } else {
          // INFO: Rule violation but no competitor overlap
          enhancedViolation.severity = 'warning' as const
          enhancedViolation.message = this.generateCompetitorAwareMessage(
            rule, 
            violation, 
            [],
            'info'
          )
        }

        enhancedViolations.push(enhancedViolation)
      } catch (error) {
        console.error('Error checking competitor conflicts:', error)
        // Fall back to original violation if competitor check fails
        enhancedViolations.push(violation)
      }
    }

    return enhancedViolations
  }

  /**
   * Generate competitor-aware violation messages
   */
  private static generateCompetitorAwareMessage(
    rule: RuleWithConditions,
    violation: RuleViolation,
    conflictingCompetitors: string[],
    type: 'critical' | 'info'
  ): string {
    const baseMessage = `${rule.name}: ${violation.actualIntervalMinutes} perc köz (${violation.requiredIntervalMinutes} perc szükséges)`
    
    if (type === 'critical' && conflictingCompetitors.length > 0) {
      const competitorList = conflictingCompetitors.slice(0, 3).join(', ')
      const moreCount = conflictingCompetitors.length > 3 ? ` +${conflictingCompetitors.length - 3} más` : ''
      
      return `🚨 Valódi: ${baseMessage} | Érintett versenyzők: ${competitorList}${moreCount}`
    } else {
      return `ℹ️ Elméleti: ${baseMessage} | Nincs közös versenyző a két futamban`
    }
  }

  /**
   * Get violation priority for sorting (higher = more important)
   */
  private static getViolationPriority(violation: any): number {
    if (violation.competitorOverlap && violation.severity === 'error') {
      return 100 // Critical: Rule + Competitor overlap
    } else if (violation.severity === 'error') {
      return 50 // Error without competitor context
    } else if (violation.competitorOverlap) {
      return 30 // Competitor overlap but not rule violation
    } else if (violation.severity === 'info') {
      return 10 // Rule violation but no competitors
    } else {
      return 0 // Other warnings
    }
  }
}

/**
 * Enhanced conflict detection interface with competitor awareness
 */
export class ConflictDetector {
  /**
   * Main entry point for schedule validation
   */
  static async detectConflicts(scheduleRaces: ScheduleRace[], rules: RuleWithConditions[]): Promise<RuleViolation[]> {
    try {
      return await RuleProcessor.checkScheduleViolations(scheduleRaces, rules)
    } catch (error) {
      console.error('Error during conflict detection:', error)
      return []
    }
  }

  /**
   * Enhanced conflict detection with competitor awareness
   * When pdfExtractionId is provided, violations are prioritized based on actual competitor overlaps
   */
  static async detectCompetitorAwareConflicts(
    scheduleRaces: ScheduleRace[], 
    rules: RuleWithConditions[], 
    pdfExtractionId?: number
  ): Promise<RuleViolation[]> {
    try {
      if (!pdfExtractionId) {
        // Fall back to normal conflict detection
        return await RuleProcessor.checkScheduleViolations(scheduleRaces, rules)
      }

      return await CompetitorAwareRuleProcessor.checkScheduleViolationsWithCompetitors(
        scheduleRaces, 
        rules, 
        pdfExtractionId
      )
    } catch (error) {
      console.error('Error during competitor-aware conflict detection:', error)
      return []
    }
  }

  /**
   * Quick check if schedule has any violations
   */
  static async hasConflicts(scheduleRaces: ScheduleRace[], rules: RuleWithConditions[]): Promise<boolean> {
    const violations = await this.detectConflicts(scheduleRaces, rules)
    return violations.length > 0
  }

  /**
   * Get only error-level violations (same time conflicts)
   */
  static async getErrorViolations(scheduleRaces: ScheduleRace[], rules: RuleWithConditions[]): Promise<RuleViolation[]> {
    const violations = await this.detectConflicts(scheduleRaces, rules)
    return violations.filter(v => v.severity === 'error')
  }

  /**
   * Get only warning-level violations
   */
  static async getWarningViolations(scheduleRaces: ScheduleRace[], rules: RuleWithConditions[]): Promise<RuleViolation[]> {
    const violations = await this.detectConflicts(scheduleRaces, rules)
    return violations.filter(v => v.severity === 'warning')
  }
}