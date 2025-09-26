package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.ScheduleMapper;
import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleItemDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleStatisticsDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithPDFContextDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import hu.szabolcst.idorendmaker.repository.PDFExtractionRepository;
import hu.szabolcst.idorendmaker.repository.ScheduleItemRepository;
import hu.szabolcst.idorendmaker.repository.ScheduleRepository;
import hu.szabolcst.idorendmaker.repository.ScheduleSectionRepository;
import hu.szabolcst.idorendmaker.service.ScheduleService;
import hu.szabolcst.idorendmaker.utils.ScheduleTimeCalculator;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final ScheduleSectionRepository scheduleSectionRepository;
    private final ScheduleItemRepository scheduleItemRepository;
    private final PDFExtractionRepository pdfExtractionRepository;
    private final ScheduleMapper scheduleMapper;

    @Override
    @Transactional
    public List<ScheduleDto> getAllSchedules() {
        log.debug("Getting all schedules");
        return scheduleRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(scheduleMapper::toDto)
                .toList();
    }

    @Override
    @Transactional
    public Integer createSchedule(final String name) {
        log.debug("Creating new schedule with name: {}", name);
        
        final Schedule schedule = new Schedule();
        schedule.setName(name);
        // createdAt and updatedAt are set automatically by @PrePersist
        
        final Schedule saved = scheduleRepository.save(schedule);
        log.info("Created schedule with id: {} and name: {}", saved.getId(), saved.getName());
        
        return saved.getId();
    }

    @Override
    @Transactional
    public List<ScheduleItemWithRaceAndSectionDto> getScheduleItems(final Integer scheduleId) {
        log.debug("Getting schedule items for schedule id: {}", scheduleId);
        
        final List<ScheduleItem> items = scheduleItemRepository.findAllByScheduleIdWithRaceAndLevel(scheduleId);
        
        // Convert to DTOs and calculate start times
        final List<ScheduleItemWithRaceAndSectionDto> result = new ArrayList<>();
        for (final ScheduleItem item : items) {
            final ScheduleItemWithRaceAndSectionDto dto = scheduleMapper.toScheduleItemWithRaceAndSectionDto(item);
            
            // Calculate start time - get all items in the same section for calculation
            final String sectionStartTime = item.getSection() != null ? item.getSection().getStartTime() : "08:00";
            final List<ScheduleItem> sectionItems = items.stream()
                    .filter(si -> si.getSectionId().equals(item.getSectionId()))
                    .sorted(Comparator.comparingInt(ScheduleItem::getOrderIndex))
                    .toList();
                    
            final List<Integer> intervals = sectionItems.subList(0, item.getOrderIndex())
                    .stream()
                    .map(ScheduleItem::getIntervalMinutes)
                    .toList();
                    
            dto.setCalculatedStartTime(
                ScheduleTimeCalculator.calculateStartTimeForOrderIndex(
                    item.getOrderIndex(), intervals, sectionStartTime
                )
            );
            
            result.add(dto);
        }
        
        log.debug("Found {} schedule items for schedule {}", result.size(), scheduleId);
        return result;
    }

    @Override
    @Transactional
    public Integer createScheduleItem(final Integer scheduleId, final Integer sectionId, final Integer raceId,
                                     final Integer levelId, final Integer orderIndex, final Integer intervalMinutes, final String notes) {
        log.debug("Creating schedule item for schedule {} in section {} with race {} and level {}", 
                 scheduleId, sectionId, raceId, levelId);
                 
        final ScheduleItem item = new ScheduleItem();
        item.setScheduleId(scheduleId);
        item.setSectionId(sectionId);
        item.setRaceId(raceId);
        item.setLevelId(levelId);
        item.setOrderIndex(orderIndex);
        item.setIntervalMinutes(intervalMinutes != null ? intervalMinutes : 0);
        item.setNotes(notes);
        // createdAt is set automatically by @PrePersist
        
        final ScheduleItem saved = scheduleItemRepository.save(item);
        log.info("Created schedule item with id: {}", saved.getId());
        
        return saved.getId();
    }

    @Override
    @Transactional
    public Integer saveScheduleWithSections(final String name, final List<CreateScheduleSectionDataDto> sectionsData, final Integer pdfExtractionId) {
        log.debug("Saving new schedule '{}' with {} sections and PDF extraction id: {}", 
                 name, sectionsData.size(), pdfExtractionId);
                 
        // Create the schedule
        final Schedule schedule = new Schedule();
        schedule.setName(name);
        schedule.setPdfExtractionId(pdfExtractionId);
        final Schedule savedSchedule = scheduleRepository.save(schedule);
        
        // If PDF data is linked, promote it from session to linked status
        if (pdfExtractionId != null) {
            final Optional<PDFExtraction> pdfOpt = pdfExtractionRepository.findById(pdfExtractionId);
            if (pdfOpt.isPresent()) {
                final PDFExtraction pdf = pdfOpt.get();
                pdf.setStatus("linked");
                pdf.setLinkedAt(LocalDateTime.now());
                pdf.setExpiresAt(null); // Linked data doesn't expire
                pdfExtractionRepository.save(pdf);
                log.info("PDF extraction {} linked to schedule {}", pdfExtractionId, savedSchedule.getId());
            }
        }
        
        // Create all sections with their items
        for (final CreateScheduleSectionDataDto sectionData : sectionsData) {
            final ScheduleSection section = new ScheduleSection();
            section.setScheduleId(savedSchedule.getId());
            section.setDayNumber(sectionData.getDayNumber());
            section.setSectionType(sectionData.getSectionType());
            section.setStartTime(sectionData.getStartTime());
            final ScheduleSection savedSection = scheduleSectionRepository.save(section);
            
            // Create all items for this section
            if (sectionData.getItems() != null) {
                for (final CreateScheduleItemDataDto itemData : sectionData.getItems()) {
                    final ScheduleItem item = new ScheduleItem();
                    item.setScheduleId(savedSchedule.getId());
                    item.setSectionId(savedSection.getId());
                    item.setRaceId(itemData.getRaceId());
                    item.setLevelId(itemData.getLevelId());
                    item.setOrderIndex(itemData.getOrderIndex());
                    item.setIntervalMinutes(itemData.getIntervalMinutes());
                    item.setNotes(itemData.getNotes());
                    scheduleItemRepository.save(item);
                }
            }
        }
        
        log.info("Saved schedule {} with {} sections", savedSchedule.getId(), sectionsData.size());
        return savedSchedule.getId();
    }

    @Override
    @Transactional
    public Integer updateScheduleWithSections(final Integer scheduleId, final String name,
                                             final List<CreateScheduleSectionDataDto> sectionsData, final Integer pdfExtractionId) {
        log.debug("Updating schedule {} with name '{}' and {} sections", scheduleId, name, sectionsData.size());
        
        // Update the schedule
        final Optional<Schedule> scheduleOpt = scheduleRepository.findById(scheduleId);
        if (scheduleOpt.isEmpty()) {
            throw new IllegalArgumentException("Schedule not found: " + scheduleId);
        }
        
        final Schedule schedule = scheduleOpt.get();
        schedule.setName(name);
        schedule.setPdfExtractionId(pdfExtractionId);
        schedule.setUpdatedAt(LocalDateTime.now());
        scheduleRepository.save(schedule);
        
        // If PDF data is linked, promote it from session to linked status
        if (pdfExtractionId != null) {
            final Optional<PDFExtraction> pdfOpt = pdfExtractionRepository.findById(pdfExtractionId);
            if (pdfOpt.isPresent()) {
                final PDFExtraction pdf = pdfOpt.get();
                pdf.setStatus("linked");
                pdf.setLinkedAt(LocalDateTime.now());
                pdf.setExpiresAt(null); // Linked data doesn't expire
                pdfExtractionRepository.save(pdf);
                log.info("PDF extraction {} linked to schedule {}", pdfExtractionId, scheduleId);
            }
        }
        
        // Delete existing sections and their items (cascade delete handles items)
        scheduleSectionRepository.deleteAllByScheduleId(scheduleId);
        
        // Create all sections with their items (same logic as create)
        for (final CreateScheduleSectionDataDto sectionData : sectionsData) {
            final ScheduleSection section = new ScheduleSection();
            section.setScheduleId(scheduleId);
            section.setDayNumber(sectionData.getDayNumber());
            section.setSectionType(sectionData.getSectionType());
            section.setStartTime(sectionData.getStartTime());
            final ScheduleSection savedSection = scheduleSectionRepository.save(section);
            
            // Create all items for this section
            if (sectionData.getItems() != null) {
                for (final CreateScheduleItemDataDto itemData : sectionData.getItems()) {
                    final ScheduleItem item = new ScheduleItem();
                    item.setScheduleId(scheduleId);
                    item.setSectionId(savedSection.getId());
                    item.setRaceId(itemData.getRaceId());
                    item.setLevelId(itemData.getLevelId());
                    item.setOrderIndex(itemData.getOrderIndex());
                    item.setIntervalMinutes(itemData.getIntervalMinutes());
                    item.setNotes(itemData.getNotes());
                    scheduleItemRepository.save(item);
                }
            }
        }
        
        log.info("Updated schedule {} with {} sections", scheduleId, sectionsData.size());
        return scheduleId;
    }

    @Override
    @Transactional
    public Integer createScheduleSection(final CreateScheduleSectionDataDto data) {
        log.debug("Creating schedule section for schedule {}: day {}, type {}", 
                 data.getScheduleId(), data.getDayNumber(), data.getSectionType());
                 
        final ScheduleSection section = new ScheduleSection();
        section.setScheduleId(data.getScheduleId());
        section.setDayNumber(data.getDayNumber());
        section.setSectionType(data.getSectionType());
        section.setStartTime(data.getStartTime());
        
        final ScheduleSection saved = scheduleSectionRepository.save(section);
        log.info("Created schedule section with id: {}", saved.getId());
        
        return saved.getId();
    }

    @Override
    @Transactional
    public List<ScheduleSectionDto> getScheduleSections(final Integer scheduleId) {
        log.debug("Getting schedule sections for schedule id: {}", scheduleId);
        
        final List<ScheduleSection> sections = scheduleSectionRepository
                .findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(scheduleId);
                
        final List<ScheduleSectionDto> result = sections.stream()
                .map(scheduleMapper::toDto)
                .toList();
                
        log.debug("Found {} sections for schedule {}", result.size(), scheduleId);
        return result;
    }

    @Override
    @Transactional
    public List<ScheduleItemWithRaceAndSectionDto> getScheduleItemsBySection(final Integer sectionId) {
        log.debug("Getting schedule items for section id: {}", sectionId);
        
        final List<ScheduleItem> items = scheduleItemRepository
                .findAllBySectionIdWithRaceAndLevelAndSection(sectionId);
        
        // Convert to DTOs with calculated start times
        if (items.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Get section start time from first item
        final String sectionStartTime = items.getFirst().getSection() != null ?
                items.getFirst().getSection().getStartTime() : "08:00";
                
        return scheduleMapper.mapItemsWithRaceAndSectionAndCalculatedTime(items, sectionStartTime);
    }

    @Override
    @Transactional
    public Optional<ScheduleWithSectionsDto> getScheduleWithSections(final Integer scheduleId) {
        log.debug("Getting schedule with sections for id: {}", scheduleId);
        
        // Step 1: Get schedule with sections only (no items to avoid multiple bag fetch)
        final Optional<Schedule> scheduleOpt = scheduleRepository.findByIdWithSections(scheduleId);
        
        if (scheduleOpt.isEmpty()) {
            log.debug("Schedule not found: {}", scheduleId);
            return Optional.empty();
        }
        
        final Schedule schedule = scheduleOpt.get();
        
        // Step 2: Get schedule items separately with their races and age groups
        final List<ScheduleItem> scheduleItems = scheduleItemRepository.findAllByScheduleIdWithRaceAndLevel(scheduleId);
        
        // Step 3: Manually populate items into their respective sections
        for (final ScheduleItem item : scheduleItems) {
            final Integer sectionId = item.getSectionId();
            schedule.getSections().stream()
                    .filter(section -> section.getId().equals(sectionId))
                    .findFirst()
                    .ifPresent(section -> section.getScheduleItems().add(item));
        }
        
        final ScheduleWithSectionsDto result = scheduleMapper.toScheduleWithSectionsDto(schedule);
        
        log.debug("Found schedule {} with {} sections and {} total items", scheduleId, 
                 result.getSections() != null ? result.getSections().size() : 0,
                 scheduleItems.size());
        return Optional.of(result);
    }

    @Override
    @Transactional
    public ScheduleWithPDFContextDto getScheduleWithPDFContext(final Integer scheduleId) {
        log.debug("Getting schedule with PDF context for id: {}", scheduleId);
        
        final Optional<ScheduleWithSectionsDto> scheduleOpt = getScheduleWithSections(scheduleId);
        
        final ScheduleWithPDFContextDto result = new ScheduleWithPDFContextDto();
        result.setSchedule(scheduleOpt.orElse(null));
        
        if (scheduleOpt.isEmpty()) {
            result.setHasPDFData(false);
            return result;
        }
        
        final ScheduleWithSectionsDto schedule = scheduleOpt.get();
        final boolean hasPDFData = schedule.getPdfExtractionId() != null;
        final Integer pdfExtractionId = schedule.getPdfExtractionId();
        
        result.setPdfExtractionId(pdfExtractionId);
        result.setHasPDFData(hasPDFData);
        
        // Log restoration of PDF context
        if (hasPDFData) {
            log.info("Schedule {} has linked PDF data (extraction ID: {}) - competitor-aware features available", 
                    scheduleId, pdfExtractionId);
        } else {
            log.debug("Schedule {} has no PDF data - standard scheduling mode", scheduleId);
        }
        
        return result;
    }

    @Override
    @Transactional
    public void deleteSchedule(final Integer scheduleId) {
        log.debug("Deleting schedule: {}", scheduleId);

        // Get schedule to check if it has PDF extraction before deletion
        final Optional<Schedule> scheduleOpt = scheduleRepository.findById(scheduleId);
        final Integer pdfExtractionId = scheduleOpt.map(Schedule::getPdfExtractionId).orElse(null);

        // Delete schedule items (explicit deletion, though cascade would handle this)
        scheduleItemRepository.deleteAllByScheduleId(scheduleId);

        // Delete schedule sections (explicit deletion, though cascade would handle this)
        scheduleSectionRepository.deleteAllByScheduleId(scheduleId);

        // Delete the schedule itself
        scheduleRepository.deleteById(scheduleId);

        // Update PDF extraction status if this was the last schedule using it
        if (pdfExtractionId != null) {
            final long remainingSchedulesCount = scheduleRepository.countByPdfExtractionId(pdfExtractionId);
            if (remainingSchedulesCount == 0) {
                final Optional<PDFExtraction> pdfOpt = pdfExtractionRepository.findById(pdfExtractionId);
                if (pdfOpt.isPresent()) {
                    final PDFExtraction pdf = pdfOpt.get();
                    pdf.setStatus("session");
                    pdf.setLinkedAt(null);
                    pdf.setExpiresAt(LocalDateTime.now().plusHours(24)); // Restore 24h expiry
                    pdfExtractionRepository.save(pdf);
                    log.info("PDF extraction {} reverted to session status (no schedules remaining)", pdfExtractionId);
                }
            }
        }

        log.info("Schedule {} and all associated data deleted successfully", scheduleId);
    }

    @Override
    @Transactional
    public void updateScheduleName(final Integer scheduleId, final String newName) {
        log.debug("Updating schedule {} name to: {}", scheduleId, newName);

        final Optional<Schedule> scheduleOpt = scheduleRepository.findById(scheduleId);
        if (scheduleOpt.isEmpty()) {
            throw new IllegalArgumentException("Schedule not found with ID: " + scheduleId);
        }

        final Schedule schedule = scheduleOpt.get();
        schedule.setName(newName);
        schedule.setUpdatedAt(LocalDateTime.now());

        scheduleRepository.save(schedule);

        log.info("Schedule {} name updated successfully to: {}", scheduleId, newName);
    }

    @Override
    @Transactional(readOnly = true)
    public ScheduleStatisticsDto getScheduleStatistics(final Integer scheduleId) {
        log.debug("Getting statistics for schedule: {}", scheduleId);

        // Check if schedule exists
        final Optional<Schedule> scheduleOpt = scheduleRepository.findById(scheduleId);
        if (scheduleOpt.isEmpty()) {
            throw new IllegalArgumentException("Schedule not found with ID: " + scheduleId);
        }

        final Schedule schedule = scheduleOpt.get();

        // Get all sections for this schedule
        final List<ScheduleSection> sections = scheduleSectionRepository.findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(scheduleId);
        final int totalSections = sections.size();

        // Get all schedule items for this schedule
        final List<ScheduleItem> allItems = scheduleItemRepository.findAllByScheduleIdOrderByOrderIndexAsc(scheduleId);
        final int totalRaces = allItems.size();

        // Calculate unique race types (distinct race IDs)
        final long uniqueRaceTypes = allItems.stream()
                .mapToInt(ScheduleItem::getRaceId)
                .distinct()
                .count();

        // Calculate most common interval
        final int mostCommonInterval = allItems.stream()
                .map(ScheduleItem::getIntervalMinutes)
                .filter(interval -> interval != null && interval > 0)
                .collect(java.util.stream.Collectors.groupingBy(
                        java.util.function.Function.identity(),
                        java.util.stream.Collectors.counting()
                ))
                .entrySet().stream()
                .max(java.util.Map.Entry.comparingByValue())
                .map(java.util.Map.Entry::getKey)
                .orElse(0); // Default to 0 minutes if no intervals found

        // Calculate average races per section
        final Double averageRacesPerSection = totalSections > 0 ? (double) totalRaces / totalSections : 0.0;

        // Calculate total duration (simplified - this could be more sophisticated)
        int totalDurationMinutes = 0;
        for (final ScheduleSection section : sections) {
            // Count items in this section
            final long itemsInSection = allItems.stream()
                    .filter(item -> item.getSectionId().equals(section.getId()))
                    .count();

            if (itemsInSection > 0) {
                // Calculate section duration: (items - 1) * average interval + estimated race duration
                final int sectionDuration = (int) ((itemsInSection - 1) * mostCommonInterval + itemsInSection * 10); // Assume 10 min per race
                totalDurationMinutes += sectionDuration;
            }
        }

        // Check if schedule has PDF data
        final boolean hasPDFData = schedule.getPdfExtractionId() != null;

        final ScheduleStatisticsDto statistics = new ScheduleStatisticsDto(
                totalSections,
                totalRaces,
                totalDurationMinutes,
                averageRacesPerSection,
                hasPDFData,
                (int) uniqueRaceTypes,
                mostCommonInterval
        );

        log.debug("Generated statistics for schedule {}: {} sections, {} races, {} minutes total",
                scheduleId, totalSections, totalRaces, totalDurationMinutes);

        return statistics;
    }
}
