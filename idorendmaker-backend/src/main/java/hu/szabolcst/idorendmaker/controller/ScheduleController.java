package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleStatisticsDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithPDFContextDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import hu.szabolcst.idorendmaker.service.ScheduleService;
import java.util.List;
import java.util.Optional;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Schedule operations
 * Maps TypeScript IPC handlers to HTTP endpoints
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    /**
     * Get all schedules ordered by creation date
     * Equivalent to IPC: 'db:getAllSchedules'
     * TypeScript: getAllSchedules(): Promise<Schedule[]>
     */
    @GetMapping
    public ResponseEntity<List<ScheduleDto>> getAllSchedules() {
        log.debug("GET /api/schedules - Getting all schedules");
        
        final List<ScheduleDto> schedules = scheduleService.getAllSchedules();
        
        log.debug("Found {} schedules", schedules.size());
        return ResponseEntity.ok(schedules);
    }

    /**
     * Create a new schedule
     * Equivalent to IPC: 'db:createSchedule'
     * TypeScript: createSchedule(name: string): Promise<number>
     */
    @PostMapping
    public ResponseEntity<Integer> createSchedule(@RequestBody final CreateScheduleRequest request) {
        log.debug("POST /api/schedules - Creating new schedule with name: {}", request.getName());
        
        final Integer scheduleId = scheduleService.createSchedule(request.getName());
        
        log.info("Created schedule with id: {}", scheduleId);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleId);
    }

    /**
     * Get schedule items for a specific schedule (legacy compatibility)
     * Equivalent to IPC: 'db:getScheduleItems'
     * TypeScript: getScheduleItems(scheduleId: number): Promise<ScheduleItemWithRace[]>
     */
    @GetMapping("/{id}/items")
    public ResponseEntity<List<ScheduleItemWithRaceAndSectionDto>> getScheduleItems(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/items - Getting schedule items", id);
        
        final List<ScheduleItemWithRaceAndSectionDto> items = scheduleService.getScheduleItems(id);
        
        log.debug("Found {} items for schedule {}", items.size(), id);
        return ResponseEntity.ok(items);
    }

    /**
     * Create a schedule item
     * Equivalent to IPC: 'db:createScheduleItem'
     */
    @PostMapping("/{id}/sections/{sectionId}/items")
    public ResponseEntity<Integer> createScheduleItem(
            @PathVariable final Integer id,
            @PathVariable final Integer sectionId,
            @RequestBody final CreateScheduleItemRequest request) {
        log.debug("POST /api/schedules/{}/sections/{}/items - Creating schedule item", id, sectionId);
        
        final Integer itemId = scheduleService.createScheduleItem(
                id, sectionId, request.getRaceId(), request.getLevelId(),
                request.getOrderIndex(), request.getIntervalMinutes(), request.getNotes());
        
        log.info("Created schedule item with id: {}", itemId);
        return ResponseEntity.status(HttpStatus.CREATED).body(itemId);
    }

    /**
     * Save schedule with sections and items (transaction)
     * Equivalent to IPC: 'db:saveScheduleWithSections'
     */
    @PostMapping("/with-sections")
    public ResponseEntity<Integer> saveScheduleWithSections(@RequestBody final SaveScheduleWithSectionsRequest request) {
        log.debug("POST /api/schedules/with-sections - Saving schedule with {} sections", 
                 request.getSectionsData().size());
        
        final Integer scheduleId = scheduleService.saveScheduleWithSections(
                request.getName(), request.getSectionsData(), request.getPdfExtractionId());
        
        log.info("Saved schedule with id: {}", scheduleId);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleId);
    }

    /**
     * Update existing schedule with sections and items (transaction)
     * Equivalent to IPC: 'db:updateScheduleWithSections'
     */
    @PutMapping("/{id}/with-sections")
    public ResponseEntity<Integer> updateScheduleWithSections(
            @PathVariable final Integer id,
            @RequestBody final UpdateScheduleWithSectionsRequest request) {
        log.debug("PUT /api/schedules/{}/with-sections - Updating schedule with {} sections", 
                 id, request.getSectionsData().size());
        
        final Integer updatedId = scheduleService.updateScheduleWithSections(
                id, request.getName(), request.getSectionsData(), request.getPdfExtractionId());
        
        log.info("Updated schedule with id: {}", updatedId);
        return ResponseEntity.ok(updatedId);
    }

    /**
     * Create a schedule section
     * Equivalent to IPC: 'db:createScheduleSection'
     */
    @PostMapping("/{id}/sections")
    public ResponseEntity<Integer> createScheduleSection(
            @PathVariable final Integer id,
            @RequestBody final CreateScheduleSectionDataDto sectionData) {
        log.debug("POST /api/schedules/{}/sections - Creating schedule section", id);
        
        // Set the schedule ID from path parameter
        sectionData.setScheduleId(id);
        final Integer sectionId = scheduleService.createScheduleSection(sectionData);
        
        log.info("Created schedule section with id: {}", sectionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionId);
    }

    /**
     * Get all sections for a schedule
     * Equivalent to IPC: 'db:getScheduleSections'
     */
    @GetMapping("/{id}/sections")
    public ResponseEntity<List<ScheduleSectionDto>> getScheduleSections(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/sections - Getting schedule sections", id);
        
        final List<ScheduleSectionDto> sections = scheduleService.getScheduleSections(id);
        
        log.debug("Found {} sections for schedule {}", sections.size(), id);
        return ResponseEntity.ok(sections);
    }

    /**
     * Get schedule items by section with calculated start times
     * Equivalent to IPC: 'db:getScheduleItemsBySection'
     */
    @GetMapping("/sections/{sectionId}/items")
    public ResponseEntity<List<ScheduleItemWithRaceAndSectionDto>> getScheduleItemsBySection(
            @PathVariable final Integer sectionId) {
        log.debug("GET /api/schedules/sections/{}/items - Getting items by section", sectionId);
        
        final List<ScheduleItemWithRaceAndSectionDto> items = scheduleService.getScheduleItemsBySection(sectionId);
        
        log.debug("Found {} items for section {}", items.size(), sectionId);
        return ResponseEntity.ok(items);
    }

    /**
     * Get schedule with all its sections, schedule items, and PDF data if linked
     * Equivalent to IPC: 'db:getScheduleWithSections'
     */
    @GetMapping("/{id}/with-sections")
    public ResponseEntity<ScheduleWithSectionsDto> getScheduleWithSections(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/with-sections - Getting schedule with sections", id);
        
        final Optional<ScheduleWithSectionsDto> schedule = scheduleService.getScheduleWithSections(id);
        
        if (schedule.isPresent()) {
            log.debug("Found schedule {} with sections", id);
            return ResponseEntity.ok(schedule.get());
        } else {
            log.debug("Schedule not found: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get schedule with PDF context restored for competitor-aware features
     * Equivalent to IPC: 'db:getScheduleWithPDFContext'
     */
    @GetMapping("/{id}/pdf-context")
    public ResponseEntity<ScheduleWithPDFContextDto> getScheduleWithPDFContext(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/pdf-context - Getting schedule with PDF context", id);
        
        final ScheduleWithPDFContextDto result = scheduleService.getScheduleWithPDFContext(id);
        
        if (result.getSchedule() != null) {
            log.debug("Found schedule {} with PDF context (hasPDFData: {})", id, result.getHasPDFData());
            return ResponseEntity.ok(result);
        } else {
            log.debug("Schedule not found: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a schedule and all its associated data
     * Equivalent to IPC: 'db:deleteSchedule'
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable final Integer id) {
        log.debug("DELETE /api/schedules/{} - Deleting schedule", id);
        
        scheduleService.deleteSchedule(id);
        
        log.info("Deleted schedule: {}", id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Update schedule name
     * Equivalent to IPC: 'db:renameSchedule'
     */
    @PutMapping("/{id}/name")
    public ResponseEntity<Void> updateScheduleName(
            @PathVariable final Integer id,
            @RequestBody final UpdateScheduleNameRequest request) {
        log.debug("PUT /api/schedules/{}/name - Updating schedule name to: {}", id, request.getName());

        scheduleService.updateScheduleName(id, request.getName());

        log.info("Updated schedule {} name to: {}", id, request.getName());
        return ResponseEntity.noContent().build();
    }

    /**
     * Get schedule statistics
     * Equivalent to IPC: 'db:getScheduleStatistics'
     */
    @GetMapping("/{id}/statistics")
    public ResponseEntity<ScheduleStatisticsDto> getScheduleStatistics(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/statistics - Getting schedule statistics", id);

        final ScheduleStatisticsDto statistics = scheduleService.getScheduleStatistics(id);

        log.debug("Retrieved statistics for schedule {}: {} sections, {} races",
                id, statistics.getTotalSections(), statistics.getTotalRaces());
        return ResponseEntity.ok(statistics);
    }

    // Request DTOs for endpoints that need them

    @Data
    public static class CreateScheduleRequest {

        private String name;

    }

    @Data
    public static class CreateScheduleItemRequest {

        private Integer raceId;
        private Integer levelId;
        private Integer orderIndex;
        private Integer intervalMinutes;
        private String notes;

    }

    @Data
    public static class SaveScheduleWithSectionsRequest {

        private String name;
        private List<CreateScheduleSectionDataDto> sectionsData;
        private Integer pdfExtractionId;

    }

    @Data
    public static class UpdateScheduleWithSectionsRequest {

        private String name;
        private List<CreateScheduleSectionDataDto> sectionsData;
        private Integer pdfExtractionId;

    }

    @Data
    public static class UpdateScheduleNameRequest {

        private String name;

    }
}
