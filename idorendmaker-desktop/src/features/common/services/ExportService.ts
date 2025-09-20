import ExcelJS from 'exceljs'
// import { ScheduleService } from '../../../data/services/ScheduleService' // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
import { BackendAPIService } from '../../../data/services/BackendAPIService' // NEW BACKEND SERVICE
// import { RuleService } from '../../../../archive/RuleService' // TEMPORARILY COMMENTED OUT FOR PRISMA MIGRATION
import { ConflictDetector } from '../../rules/utils/ruleEngine'
import { 
  ScheduleWithSections, 
  ScheduleItemWithRaceAndSection, 
  RuleViolation,
  ScheduleRace 
} from '../../../../shared/types/race'

export interface ExportRow {
  sorszam: number
  rajtIdo: string
  versenyszamNeve: string
  figyelmeztetesek: string
  megjegyzesek?: string
}

export interface ExportWarning {
  versenyszam1: string
  versenyszam2: string
  szabalyNeve: string
  problema: string
  sulyossag: string
}

export interface SectionGroup {
  sectionHeader: string
  rows: ExportRow[]
}

export class ExportService {
  
  /**
   * Export a schedule to Excel format
   */
  static async exportScheduleToExcel(scheduleId: number): Promise<Buffer> {
    try {
      // Get schedule with all its data
      const scheduleData = await this.getScheduleExportData(scheduleId)
      if (!scheduleData) {
        throw new Error('Időrend nem található')
      }

      // Generate Excel workbook
      const workbook = await this.createExcelWorkbook(scheduleData)
      
      // Convert to buffer
      return await workbook.xlsx.writeBuffer() as Buffer
    } catch (error) {
      console.error('Excel export error:', error)
      throw new Error(`Excel export hiba: ${error instanceof Error ? error.message : 'Ismeretlen hiba'}`)
    }
  }

  /**
   * Get all schedule data needed for export
   */
  private static async getScheduleExportData(scheduleId: number) {
    // Get schedule with sections
    // const schedule = await ScheduleService.getScheduleWithSections(scheduleId) // OLD PRISMA VERSION
    const schedule = await BackendAPIService.getScheduleWithSections(scheduleId) // NEW BACKEND VERSION
    if (!schedule) return null

    // Get all schedule items across all sections
    const allItems: ScheduleItemWithRaceAndSection[] = []
    for (const section of schedule.sections) {
      // const sectionItems = await ScheduleService.getScheduleItemsBySection(section.id) // OLD PRISMA VERSION
      const sectionItems = await BackendAPIService.getScheduleItemsBySection(section.id) // NEW BACKEND VERSION
      allItems.push(...sectionItems)
    }

    // Get active rules for violation detection
    const rules = await BackendAPIService.getAllRules()

    return {
      schedule,
      items: allItems,
      rules
    }
  }

  /**
   * Create Excel workbook with schedule data
   */
  private static async createExcelWorkbook(data: {
    schedule: ScheduleWithSections
    items: ScheduleItemWithRaceAndSection[]
    rules: any[]
  }): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook()
    
    // Set workbook properties
    workbook.creator = 'Időrend Készítő'
    workbook.lastModifiedBy = 'Időrend Készítő'
    workbook.created = new Date()
    workbook.modified = new Date()

    // Detect rule violations
    const violations = await this.detectRuleViolations(data.items, data.rules)

    // Generate main schedule data grouped by sections
    const groupedScheduleData = this.generateGroupedScheduleRows(data.items, violations)
    
    // Create main schedule sheet with section headers
    this.createScheduleSheetWithSections(workbook, groupedScheduleData)

    // Create warnings sheet if violations exist
    if (violations.length > 0) {
      const warningRows = this.generateWarningRows(violations, data.items)
      this.createWarningSheet(workbook, warningRows)
    }

    return workbook
  }

  /**
   * Detect rule violations for the schedule
   */
  private static async detectRuleViolations(
    items: ScheduleItemWithRaceAndSection[], 
    rules: any[]
  ): Promise<RuleViolation[]> {
    try {
      // Convert schedule items to ScheduleRace format for rule engine
      const scheduleRaces: ScheduleRace[] = items.map((item, index) => ({
        id: `${item.raceId}-${item.levelId}-${index}`, // Unique identifier
        race: item.race,
        level: item.level,
        startTime: item.calculatedStartTime || '00:00',
        order: item.orderIndex,
        day: item.section.dayNumber
      }))

      // Use existing rule engine
      return await ConflictDetector.detectConflicts(scheduleRaces, rules)
    } catch (error) {
      console.error('Rule violation detection failed:', error)
      return []
    }
  }

  /**
   * Generate main schedule rows grouped by sections for Excel
   */
  private static generateGroupedScheduleRows(
    items: ScheduleItemWithRaceAndSection[],
    violations: RuleViolation[]
  ): SectionGroup[] {
    // Sort items by section and order
    const sortedItems = [...items].sort((a, b) => {
      // First by day number, then by section type, then by order
      if (a.section.dayNumber !== b.section.dayNumber) {
        return a.section.dayNumber - b.section.dayNumber
      }
      if (a.section.sectionType !== b.section.sectionType) {
        return a.section.sectionType === 'délelőtt' ? -1 : 1
      }
      return a.orderIndex - b.orderIndex
    })

    // Group items by section
    const sectionGroups = new Map<string, ScheduleItemWithRaceAndSection[]>()
    sortedItems.forEach(item => {
      const sectionKey = `${item.section.dayNumber}-${item.section.sectionType}`
      if (!sectionGroups.has(sectionKey)) {
        sectionGroups.set(sectionKey, [])
      }
      sectionGroups.get(sectionKey)!.push(item)
    })

    let globalIndex = 1
    const result: SectionGroup[] = []

    // Process each section group
    sectionGroups.forEach((sectionItems) => {
      // Create section header - always include day number
      const firstItem = sectionItems[0]
      const sectionHeader = `${firstItem.section.dayNumber}. nap ${firstItem.section.sectionType.charAt(0).toUpperCase() + firstItem.section.sectionType.slice(1)}`

      // Generate rows for this section
      const sectionRows = sectionItems.map(item => {
        // Find warnings for this specific race+level+time combination
        const itemWarnings = violations.filter(violation => {
          const hashParts = violation.violationHash.split('-')
          if (hashParts.length >= 5) {
            const race1Id = parseInt(hashParts[1])
            const race1StartTime = hashParts[2]
            const race2Id = parseInt(hashParts[3])
            const race2StartTime = hashParts[4]
            
            // Check if this specific item (race+level+time) is involved in the violation
            const isRace1 = (race1Id === item.raceId && race1StartTime === (item.calculatedStartTime || '00:00'))
            const isRace2 = (race2Id === item.raceId && race2StartTime === (item.calculatedStartTime || '00:00'))
            
            return isRace1 || isRace2
          }
          return false
        })

        const warningText = itemWarnings.length > 0 
          ? `⚠ ${itemWarnings.length} figyelmeztetés` 
          : ''

        // Format race name with level (clean, no age groups)
        const raceName = `${item.race.name} ${item.level.name}`

        const row: ExportRow = {
          sorszam: globalIndex++,
          rajtIdo: item.calculatedStartTime || '00:00',
          versenyszamNeve: raceName,
          figyelmeztetesek: warningText,
          megjegyzesek: item.notes || ''
        }
        return row
      })

      result.push({
        sectionHeader,
        rows: sectionRows
      })
    })

    return result
  }

  /**
   * Create Excel sheet with section headers using ExcelJS
   */
  private static createScheduleSheetWithSections(workbook: ExcelJS.Workbook, groupedData: SectionGroup[]): void {
    const worksheet = workbook.addWorksheet('Időrend')
    
    // Set column definitions with auto-fit attributes
    worksheet.columns = [
      { header: 'Sorszám', key: 'sorszam', width: 10, isCustomWidth: true },
      { header: 'Rajt idő', key: 'rajtIdo', width: 12, isCustomWidth: true },
      { header: 'Versenyszám neve', key: 'versenyszamNeve', width: 50, isCustomWidth: true },
      { header: 'Figyelmeztetések', key: 'figyelmeztetesek', width: 20, isCustomWidth: true },
      { header: 'Megjegyzések', key: 'megjegyzesek', width: 30, isCustomWidth: true }
    ]
    
    let currentRow = 1
    
    // Style the main header row - only data columns (A-E)
    const headerRow = worksheet.getRow(currentRow)
    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col)
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } // White text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2196F3' } // Blue background
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
    headerRow.height = 25
    currentRow++

    // Process each section group
    groupedData.forEach((group, groupIndex) => {
      // Add empty row before section header (except for first section)
      if (groupIndex > 0) {
        currentRow++
      }
      
      // Add section header row
      const sectionRow = worksheet.getRow(currentRow)
      sectionRow.getCell(1).value = group.sectionHeader
      
      // Merge section header across all columns
      worksheet.mergeCells(`A${currentRow}:E${currentRow}`)
      
      // Style the section header - only data columns (A-E)
      for (let col = 1; col <= 5; col++) {
        const cell = sectionRow.getCell(col)
        cell.font = { bold: true, size: 12, color: { argb: 'FF1976D2' } } // Dark blue text
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE3F2FD' } // Light blue background
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
      sectionRow.height = 22
      currentRow++

      // Add data rows for this section
      group.rows.forEach(row => {
        const dataRow = worksheet.getRow(currentRow)
        
        // Set cell values
        dataRow.getCell(1).value = row.sorszam
        dataRow.getCell(2).value = row.rajtIdo
        dataRow.getCell(3).value = row.versenyszamNeve
        dataRow.getCell(4).value = row.figyelmeztetesek
        dataRow.getCell(5).value = row.megjegyzesek || ''
        
        // Apply warning formatting if this row has warnings
        const hasWarning = row.figyelmeztetesek && (row.figyelmeztetesek.includes('figyelmeztetés') || row.figyelmeztetesek.includes('⚠'))
        
        if (hasWarning) {
          // Apply amber background to entire row
          dataRow.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF3CD' } // Light amber background
            }
          })
          
          // Special formatting for warning column
          const warningCell = dataRow.getCell(4)
          warningCell.font = { bold: true, color: { argb: 'FF856404' } } // Dark amber text
          warningCell.border = {
            top: { style: 'thin', color: { argb: 'FFFFA000' } },
            left: { style: 'thin', color: { argb: 'FFFFA000' } },
            bottom: { style: 'thin', color: { argb: 'FFFFA000' } },
            right: { style: 'thin', color: { argb: 'FFFFA000' } }
          }
        } else {
          // Apply alternating row colors for better readability
          if (currentRow % 2 === 0) {
            dataRow.eachCell((cell) => {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8F9FA' } // Very light gray background
              }
            })
          }
        }
        
        dataRow.height = 18
        currentRow++
      })
    })
    
    // Smart content-based column width calculation as fallback
    worksheet.columns.forEach(column => {
      let maxLength = 0
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10
        maxLength = Math.max(maxLength, cellLength)
      })
      // Set width with minimum and padding, but respect bestFit for Excel
      column.width = Math.max(10, maxLength + 2)
    })
    
    // Add borders to all cells
    const lastRow = currentRow - 1
    
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        }
      }
    }
    
    // Smart content-based column width calculation as fallback for warning sheet
    worksheet.columns.forEach(column => {
      let maxLength = 0
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10
        maxLength = Math.max(maxLength, cellLength)
      })
      // Set width with minimum and padding, but respect bestFit for Excel
      column.width = Math.max(10, maxLength + 2)
    })
  }

  /**
   * Generate warning rows for Excel with level information
   */
  private static generateWarningRows(violations: RuleViolation[], items: ScheduleItemWithRaceAndSection[]): ExportWarning[] {
    // Create a map to lookup level information by race ID and start time
    const raceLevelMap = new Map<string, string>()
    items.forEach(item => {
      const key = `${item.raceId}-${item.calculatedStartTime || '00:00'}`
      raceLevelMap.set(key, item.level.name)
    })

    return violations.map(violation => {
      // Try to get level names for both races
      const race1Key = `${violation.race1.id}-${violation.violationHash.split('-')[2] || ''}`
      const race2Key = `${violation.race2.id}-${violation.violationHash.split('-')[4] || ''}`
      
      const race1Level = raceLevelMap.get(race1Key) || ''
      const race2Level = raceLevelMap.get(race2Key) || ''
      
      const race1Name = race1Level ? `${violation.race1.name} ${race1Level}` : `${violation.race1.name} (${violation.race1.boatClass})`
      const race2Name = race2Level ? `${violation.race2.name} ${race2Level}` : `${violation.race2.name} (${violation.race2.boatClass})`

      return {
        versenyszam1: race1Name,
        versenyszam2: race2Name,
        szabalyNeve: violation.rule.name,
        problema: violation.message,
        sulyossag: violation.severity === 'error' ? 'Hiba' : 'Figyelmeztetés'
      }
    })
  }

  /**
   * Create warning sheet using ExcelJS
   */
  private static createWarningSheet(workbook: ExcelJS.Workbook, warningRows: ExportWarning[]): void {
    const worksheet = workbook.addWorksheet('Szabály figyelmeztetések')
    
    // Set column definitions with auto-fit attributes
    worksheet.columns = [
      { header: 'Versenyszám 1', key: 'versenyszam1', width: 35, isCustomWidth: true },
      { header: 'Versenyszám 2', key: 'versenyszam2', width: 35, isCustomWidth: true },
      { header: 'Szabály neve', key: 'szabalyNeve', width: 25, isCustomWidth: true },
      { header: 'Probléma leírása', key: 'problema', width: 60, isCustomWidth: true },
      { header: 'Súlyosság', key: 'sulyossag', width: 15, isCustomWidth: true }
    ]
    
    // Style the header row - only data columns (A-E)
    const headerRow = worksheet.getRow(1)
    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col)
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } } // White text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF5722' } // Orange background for warnings
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
    headerRow.height = 25
    
    // Add data rows
    warningRows.forEach((warning, index) => {
      const row = worksheet.addRow({
        versenyszam1: warning.versenyszam1,
        versenyszam2: warning.versenyszam2,
        szabalyNeve: warning.szabalyNeve,
        problema: warning.problema,
        sulyossag: warning.sulyossag
      })
      
      // Apply alternating row colors
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF8E1' } // Very light orange background
          }
        })
      }
      
      // Configure problem description column for word wrapping
      const problemCell = row.getCell(4)
      problemCell.alignment = { wrapText: true, vertical: 'top' }
      
      // Let Excel auto-fit row height when file is opened
      // This is much more accurate than manual calculation
      
      // Highlight severity column
      const severityCell = row.getCell(5)
      if (warning.sulyossag === 'Hiba') {
        severityCell.font = { bold: true, color: { argb: 'FFD32F2F' } } // Red text for errors
      } else {
        severityCell.font = { bold: true, color: { argb: 'FFFF8F00' } } // Orange text for warnings
      }
      
      row.height = undefined // Excel will auto-fit to content
    })
    
    // Add borders to all cells
    const lastRow = warningRows.length + 1
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(row, col)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        }
      }
    }
  }

  /**
   * Generate filename for export
   */
  static generateFilename(scheduleName: string): string {
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const safeName = require('diacritics').remove(scheduleName).trim().replace(/\s+/g, '_');
    return `${safeName}_${timestamp}.xlsx`
  }
}