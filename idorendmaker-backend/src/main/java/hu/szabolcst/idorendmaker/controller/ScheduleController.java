package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithPDFContextDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import hu.szabolcst.idorendmaker.service.ScheduleService;
import java.util.List;
import java.util.Optional;
import lombok.Data;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/schedules"})
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public ResponseEntity<List<ScheduleDto>> getAllSchedules() {
        log.debug("GET /api/schedules - Getting all schedules");

        final List<ScheduleDto> schedules = this.scheduleService.getAllSchedules();

        log.debug("Found {} schedules", schedules.size());
        return ResponseEntity.ok(schedules);
    }

    @PostMapping
    public ResponseEntity<Integer> createSchedule(@RequestBody final CreateScheduleRequest request) {
        log.debug("POST /api/schedules - Creating new schedule with name: {}", request.getName());

        final Integer scheduleId = this.scheduleService.createSchedule(request.getName());

        log.info("Created schedule with id: {}", scheduleId);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleId);
    }

    @GetMapping({"/{id}/items"})
    public ResponseEntity<List<ScheduleItemWithRaceAndSectionDto>> getScheduleItems(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/items - Getting schedule items", id);

        final List<ScheduleItemWithRaceAndSectionDto> items = this.scheduleService.getScheduleItems(id);

        log.debug("Found {} items for schedule {}", items.size(), id);
        return ResponseEntity.ok(items);
    }

    @PostMapping({"/{id}/sections/{sectionId}/items"})
    public ResponseEntity<Integer> createScheduleItem(@PathVariable final Integer id, @PathVariable final Integer sectionId,
        @RequestBody final CreateScheduleItemRequest request) {
        log.debug("POST /api/schedules/{}/sections/{}/items - Creating schedule item", id, sectionId);

        final Integer itemId = this.scheduleService.createScheduleItem(id, sectionId, request
            .getRaceId(), request.getLevelId(), request
            .getOrderIndex(), request.getIntervalMinutes(), request.getNotes());

        log.info("Created schedule item with id: {}", itemId);
        return ResponseEntity.status(HttpStatus.CREATED).body(itemId);
    }

    @PostMapping({"/with-sections"})
    public ResponseEntity<Integer> saveScheduleWithSections(@RequestBody final SaveScheduleWithSectionsRequest request) {
        log.debug("POST /api/schedules/with-sections - Saving schedule with {} sections",
            request.getSectionsData().size());

        final Integer scheduleId = this.scheduleService.saveScheduleWithSections(request
            .getName(), request.getSectionsData(), request.getPdfExtractionId());

        log.info("Saved schedule with id: {}", scheduleId);
        return ResponseEntity.status(HttpStatus.CREATED).body(scheduleId);
    }

    @PutMapping({"/{id}/with-sections"})
    public ResponseEntity<Integer> updateScheduleWithSections(@PathVariable final Integer id,
        @RequestBody final UpdateScheduleWithSectionsRequest request) {
        log.debug("PUT /api/schedules/{}/with-sections - Updating schedule with {} sections", id,
            request.getSectionsData().size());

        final Integer updatedId = this.scheduleService.updateScheduleWithSections(id, request
            .getName(), request.getSectionsData(), request.getPdfExtractionId());

        log.info("Updated schedule with id: {}", updatedId);
        return ResponseEntity.ok(updatedId);
    }

    @PostMapping({"/{id}/sections"})
    public ResponseEntity<Integer> createScheduleSection(@PathVariable final Integer id, @RequestBody final CreateScheduleSectionDataDto sectionData) {
        log.debug("POST /api/schedules/{}/sections - Creating schedule section", id);

        sectionData.setScheduleId(id);
        final Integer sectionId = this.scheduleService.createScheduleSection(sectionData);

        log.info("Created schedule section with id: {}", sectionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionId);
    }

    @GetMapping({"/{id}/sections"})
    public ResponseEntity<List<ScheduleSectionDto>> getScheduleSections(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/sections - Getting schedule sections", id);

        final List<ScheduleSectionDto> sections = this.scheduleService.getScheduleSections(id);

        log.debug("Found {} sections for schedule {}", sections.size(), id);
        return ResponseEntity.ok(sections);
    }

    @GetMapping({"/sections/{sectionId}/items"})
    public ResponseEntity<List<ScheduleItemWithRaceAndSectionDto>> getScheduleItemsBySection(@PathVariable final Integer sectionId) {
        log.debug("GET /api/schedules/sections/{}/items - Getting items by section", sectionId);

        final List<ScheduleItemWithRaceAndSectionDto> items = this.scheduleService.getScheduleItemsBySection(sectionId);

        log.debug("Found {} items for section {}", items.size(), sectionId);
        return ResponseEntity.ok(items);
    }

    @GetMapping({"/{id}/with-sections"})
    public ResponseEntity<ScheduleWithSectionsDto> getScheduleWithSections(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/with-sections - Getting schedule with sections", id);

        final Optional<ScheduleWithSectionsDto> schedule = this.scheduleService.getScheduleWithSections(id);

        if (schedule.isPresent()) {
            log.debug("Found schedule {} with sections", id);
            return ResponseEntity.ok(schedule.get());
        }
        log.debug("Schedule not found: {}", id);
        return ResponseEntity.notFound().build();
    }

    @GetMapping({"/{id}/pdf-context"})
    public ResponseEntity<ScheduleWithPDFContextDto> getScheduleWithPDFContext(@PathVariable final Integer id) {
        log.debug("GET /api/schedules/{}/pdf-context - Getting schedule with PDF context", id);

        final ScheduleWithPDFContextDto result = this.scheduleService.getScheduleWithPDFContext(id);

        if (result.getSchedule() != null) {
            log.debug("Found schedule {} with PDF context (hasPDFData: {})", id, result.getHasPDFData());
            return ResponseEntity.ok(result);
        }
        log.debug("Schedule not found: {}", id);
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<Void> deleteSchedule(@PathVariable final Integer id) {
        log.debug("DELETE /api/schedules/{} - Deleting schedule", id);

        this.scheduleService.deleteSchedule(id);

        log.info("Deleted schedule: {}", id);
        return ResponseEntity.noContent().build();
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
    public static class CreateScheduleRequest {

        private String name;

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
}