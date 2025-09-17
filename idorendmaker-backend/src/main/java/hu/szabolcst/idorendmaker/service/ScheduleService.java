package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithPDFContextDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import java.util.List;
import java.util.Optional;

/**
 * Service interface for Schedule operations
 * Provides all functionality matching the TypeScript ScheduleService
 */
public interface ScheduleService {

    /**
     * Get all schedules ordered by creation date
     * Equivalent to TypeScript: getAllSchedules(): Promise<Schedule[]>
     * Equivalent to IPC: 'db:getAllSchedules'
     */
    List<ScheduleDto> getAllSchedules();

    /**
     * Create a new schedule
     * Equivalent to TypeScript: createSchedule(name: string): Promise<number>
     * Equivalent to IPC: 'db:createSchedule'
     */
    Integer createSchedule(String name);

    /**
     * Get schedule items for a specific schedule (legacy compatibility)
     * Equivalent to TypeScript: getScheduleItems(scheduleId: number): Promise<ScheduleItemWithRace[]>
     * Equivalent to IPC: 'db:getScheduleItems'
     */
    List<ScheduleItemWithRaceAndSectionDto> getScheduleItems(Integer scheduleId);

    /**
     * Create a schedule item
     * Equivalent to TypeScript: createScheduleItem(...)
     * Equivalent to IPC: 'db:createScheduleItem'
     */
    Integer createScheduleItem(Integer scheduleId, Integer sectionId, Integer raceId, 
                              Integer levelId, Integer orderIndex, Integer intervalMinutes, String notes);

    /**
     * Save schedule with sections and items (transaction)
     * Enhanced to support PDF data linking for competitor-aware features
     * Equivalent to TypeScript: saveScheduleWithSections(name: string, sectionsData: Array<...>, pdfExtractionId?: number): Promise<number>
     * Equivalent to IPC: 'db:saveScheduleWithSections'
     */
    Integer saveScheduleWithSections(String name, List<CreateScheduleSectionDataDto> sectionsData, Integer pdfExtractionId);

    /**
     * Update existing schedule with sections and items (transaction)
     * Enhanced to support PDF data linking for competitor-aware features  
     * Equivalent to TypeScript: updateScheduleWithSections(scheduleId: number, name: string, sectionsData: Array<...>, pdfExtractionId?: number): Promise<number>
     * Equivalent to IPC: 'db:updateScheduleWithSections'
     */
    Integer updateScheduleWithSections(Integer scheduleId, String name, List<CreateScheduleSectionDataDto> sectionsData, Integer pdfExtractionId);

    /**
     * Create a schedule section
     * Equivalent to TypeScript: createScheduleSection(data: CreateScheduleSectionData): Promise<number>
     * Equivalent to IPC: 'db:createScheduleSection'
     */
    Integer createScheduleSection(CreateScheduleSectionDataDto data);

    /**
     * Get all sections for a schedule
     * Equivalent to TypeScript: getScheduleSections(scheduleId: number): Promise<ScheduleSection[]>
     * Equivalent to IPC: 'db:getScheduleSections'
     */
    List<ScheduleSectionDto> getScheduleSections(Integer scheduleId);

    /**
     * Get schedule items by section with calculated start times
     * Equivalent to TypeScript: getScheduleItemsBySection(sectionId: number): Promise<ScheduleItemWithRaceAndSection[]>
     * Equivalent to IPC: 'db:getScheduleItemsBySection'
     */
    List<ScheduleItemWithRaceAndSectionDto> getScheduleItemsBySection(Integer sectionId);

    /**
     * Get schedule with all its sections, schedule items, and PDF data if linked
     * Equivalent to TypeScript: getScheduleWithSections(scheduleId: number): Promise<ScheduleWithSections | null>
     * Equivalent to IPC: 'db:getScheduleWithSections'
     */
    Optional<ScheduleWithSectionsDto> getScheduleWithSections(Integer scheduleId);

    /**
     * Get schedule with PDF context restored for competitor-aware features
     * Equivalent to TypeScript: getScheduleWithPDFContext(scheduleId: number): Promise<{schedule: ScheduleWithSections | null, pdfExtractionId?: number, hasPDFData: boolean}>
     * Equivalent to IPC: 'db:getScheduleWithPDFContext'
     */
    ScheduleWithPDFContextDto getScheduleWithPDFContext(Integer scheduleId);

    /**
     * Delete a schedule and all its associated data
     * Equivalent to TypeScript: deleteSchedule(scheduleId: number): Promise<void>
     * Equivalent to IPC: 'db:deleteSchedule'
     */
    void deleteSchedule(Integer scheduleId);
}
