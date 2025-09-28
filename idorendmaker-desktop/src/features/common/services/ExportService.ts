import ExcelJS from "exceljs";
import { BackendAPIService } from "../../../data/services/BackendAPIService";
import { ConflictDetector } from "../../rules/utils/ruleEngine";
import {
  ScheduleWithSections,
  ScheduleItemWithRaceAndSection,
  RuleViolation,
  ScheduleRace,
} from "../../../../shared/types/race";

export interface ExportRow {
  sorszam: number;
  rajtIdo: string;
  versenyszamNeve: string;
  hajoegysegekSzama?: number;
  figyelmeztetesek: string;
  megjegyzesek?: string;
  isSimultaneousStart?: boolean;
}

export interface ExportWarning {
  versenyszam1: string;
  versenyszam2: string;
  szabalyNeve: string;
  problema: string;
  sulyossag: string;
}

export interface SectionGroup {
  sectionHeader: string;
  rows: ExportRow[];
}

export class ExportService {
  /**
   * Calculate boat units from entry count and seat count
   * @param entryCount Number of individual entries/competitors
   * @param seatCount Number of seats per boat (from boat class data)
   * @returns Number of boat units, or null if calculation not possible
   */
  static calculateBoatUnits(
    entryCount: number,
    seatCount: number | null | undefined
  ): number | null {
    if (entryCount === 0) return 0;
    if (!seatCount || seatCount <= 0) return entryCount; // Fallback to 1:1 ratio
    return Math.ceil(entryCount / seatCount); // Round up for partial boats
  }

  /**
   * Export a schedule to Excel format
   */
  static async exportScheduleToExcel(scheduleId: number): Promise<Buffer> {
    try {
      // Get schedule with all its data
      const scheduleData = await this.getScheduleExportData(scheduleId);
      if (!scheduleData) {
        throw new Error("Időrend nem található");
      }

      // Generate Excel workbook
      const workbook = await this.createExcelWorkbook(scheduleData);

      // Convert to buffer
      return (await workbook.xlsx.writeBuffer()) as Buffer;
    } catch (error) {
      console.error("Excel export error:", error);
      throw new Error(
        `Excel export hiba: ${error instanceof Error ? error.message : "Ismeretlen hiba"}`
      );
    }
  }

  /**
   * Get all schedule data needed for export
   */
  private static async getScheduleExportData(scheduleId: number) {
    // Get schedule with sections
    const schedule =
      await BackendAPIService.getScheduleWithSections(scheduleId);
    if (!schedule) return null;

    // Get all schedule items across all sections
    const allItems: ScheduleItemWithRaceAndSection[] = [];
    for (const section of schedule.sections) {
      const sectionItems = await BackendAPIService.getScheduleItemsBySection(
        section.id
      );
      allItems.push(...sectionItems);
    }

    // Get active rules for violation detection
    const rules = await BackendAPIService.getAllRules();

    // Get competitor data if PDF extraction exists
    let raceCompetitorData: Map<
      number,
      { entryCount: number; seatCount: number | null }
    > | null = null;
    if (schedule.pdfExtractionId) {
      raceCompetitorData = new Map();

      // Get unique race IDs from schedule items
      const raceIds = [...new Set(allItems.map((item) => item.raceId))];

      // Fetch competitor summaries for all races in a single batch call
      try {
        const competitorSummaries = await BackendAPIService.getBatchRaceCompetitorSummary(
          raceIds,
          schedule.pdfExtractionId
        );

        // Process the batch results
        for (const raceId of raceIds) {
          const competitorSummary = competitorSummaries[raceId];

          if (competitorSummary) {
            // Get race data to access boat class information
            const raceWithBoatClass = allItems.find(
              (item) => item.raceId === raceId
            )?.race;
            const seatCount = raceWithBoatClass?.boatClassData?.seatCount || null;

            raceCompetitorData.set(raceId, {
              entryCount: competitorSummary.entryCount,
              seatCount: seatCount,
            });
          } else {
            console.warn(`No competitor data received for race ${raceId}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch batch competitor data:', error);
        // Fallback to individual calls if batch fails
        for (const raceId of raceIds) {
          try {
            const competitorSummary =
              await BackendAPIService.getRaceCompetitorSummary(
                raceId,
                schedule.pdfExtractionId
              );

            // Get race data to access boat class information
            const raceWithBoatClass = allItems.find(
              (item) => item.raceId === raceId
            )?.race;
            const seatCount = raceWithBoatClass?.boatClassData?.seatCount || null;

            raceCompetitorData.set(raceId, {
              entryCount: competitorSummary.entryCount,
              seatCount: seatCount,
            });
          } catch (individualError) {
            console.warn(
              `Failed to fetch competitor data for race ${raceId}:`,
              individualError
            );
          }
        }
      }
    }

    return {
      schedule,
      items: allItems,
      rules,
      raceCompetitorData,
    };
  }

  /**
   * Create Excel workbook with schedule data
   */
  private static async createExcelWorkbook(data: {
    schedule: ScheduleWithSections;
    items: ScheduleItemWithRaceAndSection[];
    rules: any[];
    raceCompetitorData?: Map<
      number,
      { entryCount: number; seatCount: number | null }
    > | null;
  }): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = "Időrend Készítő";
    workbook.lastModifiedBy = "Időrend Készítő";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Detect rule violations
    const violations = await this.detectRuleViolations(data.items, data.rules);

    // Generate main schedule data grouped by sections
    const groupedScheduleData = this.generateGroupedScheduleRows(
      data.items,
      violations,
      data.raceCompetitorData
    );

    // Create main schedule sheet with section headers
    const hasPDFData = !!data.raceCompetitorData;
    this.createScheduleSheetWithSections(
      workbook,
      groupedScheduleData,
      hasPDFData
    );

    // Create warnings sheet if violations exist
    if (violations.length > 0) {
      const warningRows = this.generateWarningRows(violations, data.items);
      this.createWarningSheet(workbook, warningRows);
    }

    return workbook;
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
        startTime: item.calculatedStartTime || "00:00",
        order: item.orderIndex,
        day: item.section.dayNumber,
      }));

      // Use existing rule engine
      return await ConflictDetector.detectConflicts(scheduleRaces, rules);
    } catch (error) {
      console.error("Rule violation detection failed:", error);
      return [];
    }
  }

  /**
   * Generate main schedule rows grouped by sections for Excel
   */
  private static generateGroupedScheduleRows(
    items: ScheduleItemWithRaceAndSection[],
    violations: RuleViolation[],
    raceCompetitorData?: Map<
      number,
      { entryCount: number; seatCount: number | null }
    > | null
  ): SectionGroup[] {
    // Sort items by section and order
    const sortedItems = [...items].sort((a, b) => {
      // First by day number, then by section type, then by order
      if (a.section.dayNumber !== b.section.dayNumber) {
        return a.section.dayNumber - b.section.dayNumber;
      }
      if (a.section.sectionType !== b.section.sectionType) {
        return a.section.sectionType === "délelőtt" ? -1 : 1;
      }
      return a.orderIndex - b.orderIndex;
    });

    // Group items by section
    const sectionGroups = new Map<string, ScheduleItemWithRaceAndSection[]>();
    sortedItems.forEach((item) => {
      const sectionKey = `${item.section.dayNumber}-${item.section.sectionType}`;
      if (!sectionGroups.has(sectionKey)) {
        sectionGroups.set(sectionKey, []);
      }
      sectionGroups.get(sectionKey)!.push(item);
    });

    let globalIndex = 1;
    const result: SectionGroup[] = [];

    // Process each section group
    sectionGroups.forEach((sectionItems) => {
      // Create section header - always include day number
      const firstItem = sectionItems[0];
      const sectionHeader = `${firstItem.section.dayNumber}. nap ${firstItem.section.sectionType.charAt(0).toUpperCase() + firstItem.section.sectionType.slice(1)}`;

      // Detect simultaneous start times within this section
      const startTimeCounts = new Map<string, number>();
      sectionItems.forEach((item) => {
        const startTime = item.calculatedStartTime || "00:00";
        startTimeCounts.set(startTime, (startTimeCounts.get(startTime) || 0) + 1);
      });

      // Create set of start times that have multiple races (simultaneous starts)
      const simultaneousStartTimes = new Set<string>();
      startTimeCounts.forEach((count, startTime) => {
        if (count > 1) {
          simultaneousStartTimes.add(startTime);
        }
      });

      // Generate rows for this section
      const sectionRows = sectionItems.map((item) => {
        // Find warnings for this specific race+level+time combination
        const itemWarnings = violations.filter((violation) => {
          const hashParts = violation.violationHash.split("-");
          if (hashParts.length >= 5) {
            const race1Id = parseInt(hashParts[1]);
            const race1StartTime = hashParts[2];
            const race2Id = parseInt(hashParts[3]);
            const race2StartTime = hashParts[4];

            // Check if this specific item (race+level+time) is involved in the violation
            const isRace1 =
              race1Id === item.raceId &&
              race1StartTime === (item.calculatedStartTime || "00:00");
            const isRace2 =
              race2Id === item.raceId &&
              race2StartTime === (item.calculatedStartTime || "00:00");

            return isRace1 || isRace2;
          }
          return false;
        });

        const warningText =
          itemWarnings.length > 0
            ? `⚠ ${itemWarnings.length} figyelmeztetés`
            : "";

        // Format race name with level (clean, no age groups)
        const raceName = `${item.race.name} ${item.level.name}`;

        // Calculate boat units if competitor data is available
        let boatUnits: number | undefined = undefined;
        if (raceCompetitorData?.has(item.raceId)) {
          const competitorData = raceCompetitorData.get(item.raceId)!;
          boatUnits =
            this.calculateBoatUnits(
              competitorData.entryCount,
              competitorData.seatCount
            ) || undefined;
        }

        const row: ExportRow = {
          sorszam: globalIndex++,
          rajtIdo: item.calculatedStartTime || "00:00",
          versenyszamNeve: raceName,
          hajoegysegekSzama: boatUnits,
          figyelmeztetesek: warningText,
          megjegyzesek: item.notes || "",
          isSimultaneousStart: simultaneousStartTimes.has(item.calculatedStartTime || "00:00"),
        };
        return row;
      });

      result.push({
        sectionHeader,
        rows: sectionRows,
      });
    });

    return result;
  }

  /**
   * Create Excel sheet with section headers using ExcelJS
   */
  private static createScheduleSheetWithSections(
    workbook: ExcelJS.Workbook,
    groupedData: SectionGroup[],
    hasPDFData: boolean = false
  ): void {
    const worksheet = workbook.addWorksheet("Időrend");

    // Set column definitions with auto-fit attributes
    const columns = [
      { header: "Sorszám", key: "sorszam", width: 5, isCustomWidth: true },
      { header: "Rajt idő", key: "rajtIdo", width: 5, isCustomWidth: true },
      {
        header: "Futam neve",
        key: "versenyszamNeve",
        width: 50,
        isCustomWidth: true,
      },
    ];

    // Conditionally add boat units column if PDF data exists
    if (hasPDFData) {
      columns.push({
        header: "Nevezett hajóegységek",
        key: "hajoegysegekSzama",
        width: 18,
        isCustomWidth: true,
      });
    }

    columns.push(
      {
        header: "Figyelmeztetések",
        key: "figyelmeztetesek",
        width: 20,
        isCustomWidth: true,
      },
      {
        header: "Megjegyzések",
        key: "megjegyzesek",
        width: 30,
        isCustomWidth: true,
      }
    );

    worksheet.columns = columns;

    let currentRow = 1;
    const totalColumns = columns.length;

    // Style the main header row
    const headerRow = worksheet.getRow(currentRow);
    for (let col = 1; col <= totalColumns; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2196F3" }, // Blue background
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    headerRow.height = 25;

    // Add note to boat units column header if PDF data exists
    if (hasPDFData) {
      const boatUnitsHeaderCell = headerRow.getCell(4); // Column 4 is boat units when PDF data exists
      boatUnitsHeaderCell.note = {
        texts: [
          {
            text: "értsd: a futam versenyszámához. \naz adott futamban indulók száma a továbbjutási sémától függ, pl. Magyar bajnoki 9 pályás = max 9 induló a futamban.",
          },
        ],
      };
    }

    currentRow++;

    // Process each section group
    groupedData.forEach((group, groupIndex) => {
      // Add empty row before section header (except for first section)
      if (groupIndex > 0) {
        currentRow++;
      }

      // Add section header row
      const sectionRow = worksheet.getRow(currentRow);
      sectionRow.getCell(1).value = group.sectionHeader;

      // Merge section header across all columns
      const lastColumnLetter = String.fromCharCode(64 + totalColumns); // A=65, so 64+1=A, 64+2=B, etc.
      worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);

      // Style the section header
      for (let col = 1; col <= totalColumns; col++) {
        const cell = sectionRow.getCell(col);
        cell.font = { bold: true, size: 12, color: { argb: "FF1976D2" } }; // Dark blue text
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE3F2FD" }, // Light blue background
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      }
      sectionRow.height = 22;
      currentRow++;

      // Add data rows for this section
      group.rows.forEach((row) => {
        const dataRow = worksheet.getRow(currentRow);

        // Set cell values dynamically based on column structure
        let colIndex = 1;
        dataRow.getCell(colIndex++).value = row.sorszam;
        dataRow.getCell(colIndex++).value = row.rajtIdo;
        dataRow.getCell(colIndex++).value = row.versenyszamNeve;

        // Conditionally add boat units column
        if (hasPDFData) {
          dataRow.getCell(colIndex++).value = row.hajoegysegekSzama || "";
        }

        dataRow.getCell(colIndex++).value = row.figyelmeztetesek;
        dataRow.getCell(colIndex++).value = row.megjegyzesek || "";

        // Apply warning formatting if this row has warnings
        const hasWarning =
          row.figyelmeztetesek &&
          (row.figyelmeztetesek.includes("figyelmeztetés") ||
            row.figyelmeztetesek.includes("⚠"));

        if (hasWarning) {
          // Apply amber background to entire row
          dataRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFFF3CD" }, // Light amber background
            };
          });

          // Special formatting for warning column (position depends on whether PDF data exists)
          const warningColumnIndex = hasPDFData ? 5 : 4;
          const warningCell = dataRow.getCell(warningColumnIndex);
          warningCell.font = { bold: true, color: { argb: "FF856404" } }; // Dark amber text
          warningCell.border = {
            top: { style: "thin", color: { argb: "FFFFA000" } },
            left: { style: "thin", color: { argb: "FFFFA000" } },
            bottom: { style: "thin", color: { argb: "FFFFA000" } },
            right: { style: "thin", color: { argb: "FFFFA000" } },
          };
        } else {
          // Apply alternating row colors for better readability
          if (currentRow % 2 === 0) {
            dataRow.eachCell((cell) => {
              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FFF8F9FA" }, // Very light gray background
              };
            });
          }
        }

        // Apply simultaneous start time highlighting to start time cell (column 2)
        if (row.isSimultaneousStart) {
          const startTimeCell = dataRow.getCell(2); // Column 2 is "Rajt idő" (start time)
          startTimeCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE1BEE7" }, // Light purple background
          };
          startTimeCell.font = {
            bold: true,
            color: { argb: "FF4A148C" } // Dark purple text
          };
          startTimeCell.border = {
            top: { style: "medium", color: { argb: "FF4A148C" } },
            left: { style: "medium", color: { argb: "FF4A148C" } },
            bottom: { style: "medium", color: { argb: "FF4A148C" } },
            right: { style: "medium", color: { argb: "FF4A148C" } },
          };
        }

        dataRow.height = 18;
        currentRow++;
      });
    });

    // Smart content-based column width calculation as fallback
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, cellLength);
      });
      // Set width with minimum and padding, but respect bestFit for Excel
      column.width = Math.max(10, maxLength + 2);
    });

    // Add borders to all cells
    const lastRow = currentRow - 1;

    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= totalColumns; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D0D0" } },
          left: { style: "thin", color: { argb: "FFD0D0D0" } },
          bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
          right: { style: "thin", color: { argb: "FFD0D0D0" } },
        };
      }
    }

    // Smart content-based column width calculation as fallback for warning sheet
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, cellLength);
      });
      // Set width with minimum and padding, but respect bestFit for Excel
      column.width = Math.max(10, maxLength + 2);
    });
  }

  /**
   * Generate warning rows for Excel with level information
   */
  private static generateWarningRows(
    violations: RuleViolation[],
    items: ScheduleItemWithRaceAndSection[]
  ): ExportWarning[] {
    // Create a map to lookup level information by race ID and start time
    const raceLevelMap = new Map<string, string>();
    items.forEach((item) => {
      const key = `${item.raceId}-${item.calculatedStartTime || "00:00"}`;
      raceLevelMap.set(key, item.level.name);
    });

    return violations.map((violation) => {
      // Try to get level names for both races
      const race1Key = `${violation.race1.id}-${violation.violationHash.split("-")[2] || ""}`;
      const race2Key = `${violation.race2.id}-${violation.violationHash.split("-")[4] || ""}`;

      const race1Level = raceLevelMap.get(race1Key) || "";
      const race2Level = raceLevelMap.get(race2Key) || "";

      const race1Name = race1Level
        ? `${violation.race1.name} ${race1Level}`
        : `${violation.race1.name} (${violation.race1.boatClass})`;
      const race2Name = race2Level
        ? `${violation.race2.name} ${race2Level}`
        : `${violation.race2.name} (${violation.race2.boatClass})`;

      return {
        versenyszam1: race1Name,
        versenyszam2: race2Name,
        szabalyNeve: violation.rule.name,
        problema: violation.message,
        sulyossag: violation.severity === "error" ? "Hiba" : "Figyelmeztetés",
      };
    });
  }

  /**
   * Create warning sheet using ExcelJS
   */
  private static createWarningSheet(
    workbook: ExcelJS.Workbook,
    warningRows: ExportWarning[]
  ): void {
    const worksheet = workbook.addWorksheet("Szabály figyelmeztetések");

    // Set column definitions with auto-fit attributes
    worksheet.columns = [
      {
        header: "Versenyszám 1",
        key: "versenyszam1",
        width: 35,
        isCustomWidth: true,
      },
      {
        header: "Versenyszám 2",
        key: "versenyszam2",
        width: 35,
        isCustomWidth: true,
      },
      {
        header: "Szabály neve",
        key: "szabalyNeve",
        width: 25,
        isCustomWidth: true,
      },
      {
        header: "Probléma leírása",
        key: "problema",
        width: 60,
        isCustomWidth: true,
      },
      { header: "Súlyosság", key: "sulyossag", width: 15, isCustomWidth: true },
    ];

    // Style the header row - only data columns (A-E)
    const headerRow = worksheet.getRow(1);
    for (let col = 1; col <= 5; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; // White text
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFF5722" }, // Orange background for warnings
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
    headerRow.height = 25;

    // Add data rows
    warningRows.forEach((warning, index) => {
      const row = worksheet.addRow({
        versenyszam1: warning.versenyszam1,
        versenyszam2: warning.versenyszam2,
        szabalyNeve: warning.szabalyNeve,
        problema: warning.problema,
        sulyossag: warning.sulyossag,
      });

      // Apply alternating row colors
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFFF8E1" }, // Very light orange background
          };
        });
      }

      // Configure problem description column for word wrapping
      const problemCell = row.getCell(4);
      problemCell.alignment = { wrapText: true, vertical: "top" };

      // Let Excel auto-fit row height when file is opened

      // Highlight severity column
      const severityCell = row.getCell(5);
      if (warning.sulyossag === "Hiba") {
        severityCell.font = { bold: true, color: { argb: "FFD32F2F" } }; // Red text for errors
      } else {
        severityCell.font = { bold: true, color: { argb: "FFFF8F00" } }; // Orange text for warnings
      }

      row.height = undefined; // Excel will auto-fit to content
    });

    // Add borders to all cells
    const lastRow = warningRows.length + 1;
    for (let row = 1; row <= lastRow; row++) {
      for (let col = 1; col <= 5; col++) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: "thin", color: { argb: "FFD0D0D0" } },
          left: { style: "thin", color: { argb: "FFD0D0D0" } },
          bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
          right: { style: "thin", color: { argb: "FFD0D0D0" } },
        };
      }
    }
  }

  /**
   * Generate filename for export
   */
  static generateFilename(scheduleName: string): string {
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const safeName = require("diacritics")
      .remove(scheduleName)
      .trim()
      .replace(/\s+/g, "_");
    return `${safeName}_${timestamp}.xlsx`;
  }
}
