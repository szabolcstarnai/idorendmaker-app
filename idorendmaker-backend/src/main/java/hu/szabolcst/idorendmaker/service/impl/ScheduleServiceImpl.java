package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.ScheduleMapper;
import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleItemDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithPDFContextDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import hu.szabolcst.idorendmaker.repository.jdbc.PDFExtractionJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.ScheduleItemJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.ScheduleJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.ScheduleSectionJdbcRepository;
import hu.szabolcst.idorendmaker.service.ScheduleService;
import hu.szabolcst.idorendmaker.utils.ScheduleTimeCalculator;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleJdbcRepository scheduleRepository;
    private final ScheduleSectionJdbcRepository scheduleSectionRepository;
    private final ScheduleItemJdbcRepository scheduleItemRepository;
    private final PDFExtractionJdbcRepository pdfExtractionRepository;
    private final ScheduleMapper scheduleMapper;

    @Transactional
    public List<ScheduleDto> getAllSchedules() {
        log.debug("Getting all schedules");

        Objects.requireNonNull(this.scheduleMapper);
        return this.scheduleRepository.findAllByOrderByCreatedAtDesc().stream().map(this.scheduleMapper::toDto)
            .toList();
    }


    @Transactional
    public Integer createSchedule(final String name) {
        log.debug("Creating new schedule with name: {}", name);

        final Schedule schedule = new Schedule();
        schedule.setName(name);

        final Schedule saved = this.scheduleRepository.save(schedule);
        log.info("Created schedule with id: {} and name: {}", saved.getId(), saved.getName());

        return saved.getId();
    }


    @Transactional
    public List<ScheduleItemWithRaceAndSectionDto> getScheduleItems(final Integer scheduleId) {
        log.debug("Getting schedule items for schedule id: {}", scheduleId);

        final List<ScheduleItem> items = this.scheduleItemRepository.findAllByScheduleIdWithRaceAndLevel(scheduleId);

        final List<ScheduleItemWithRaceAndSectionDto> result = new ArrayList<>();
        for (final ScheduleItem item : items) {
            final ScheduleItemWithRaceAndSectionDto dto = this.scheduleMapper.toScheduleItemWithRaceAndSectionDto(item);

            final String sectionStartTime = (item.getSection() != null) ? item.getSection().getStartTime() : "08:00";

            final List<ScheduleItem> sectionItems = items.stream().filter(si -> si.getSectionId().equals(item.getSectionId()))
                .sorted(Comparator.comparingInt(ScheduleItem::getOrderIndex)).toList();

            final List<Integer> intervals = sectionItems.subList(0, item.getOrderIndex()).stream().map(ScheduleItem::getIntervalMinutes)
                .toList();

            dto.setCalculatedStartTime(
                ScheduleTimeCalculator.calculateStartTimeForOrderIndex(item
                    .getOrderIndex(), intervals, sectionStartTime));

            result.add(dto);
        }

        log.debug("Found {} schedule items for schedule {}", result.size(), scheduleId);
        return result;
    }


    @Transactional
    public Integer createScheduleItem(final Integer scheduleId, final Integer sectionId, final Integer raceId, final Integer levelId,
        final Integer orderIndex, final Integer intervalMinutes, final String notes) {
        log.debug("Creating schedule item for schedule {} in section {} with race {} and level {}", scheduleId, sectionId, raceId, levelId);

        final ScheduleItem item = new ScheduleItem();
        item.setScheduleId(scheduleId);
        item.setSectionId(sectionId);
        item.setRaceId(raceId);
        item.setLevelId(levelId);
        item.setOrderIndex(orderIndex);
        item.setIntervalMinutes((intervalMinutes != null) ? intervalMinutes : 15);
        item.setNotes(notes);

        final ScheduleItem saved = this.scheduleItemRepository.save(item);
        log.info("Created schedule item with id: {}", saved.getId());

        return saved.getId();
    }


    @Transactional
    public Integer saveScheduleWithSections(final String name, final List<CreateScheduleSectionDataDto> sectionsData,
        final Integer pdfExtractionId) {
        log.debug("Saving new schedule '{}' with {} sections and PDF extraction id: {}", name,
            sectionsData.size(), pdfExtractionId);

        final Schedule schedule = new Schedule();
        schedule.setName(name);
        schedule.setPdfExtractionId(pdfExtractionId);
        final Schedule savedSchedule = this.scheduleRepository.save(schedule);

        if (pdfExtractionId != null) {
            final Optional<PDFExtraction> pdfOpt = this.pdfExtractionRepository.findById(pdfExtractionId);
            if (pdfOpt.isPresent()) {
                final PDFExtraction pdf = pdfOpt.get();
                pdf.setStatus("linked");
                pdf.setLinkedAt(LocalDateTime.now());
                pdf.setExpiresAt(null);
                this.pdfExtractionRepository.save(pdf);
                log.info("PDF extraction {} linked to schedule {}", pdfExtractionId, savedSchedule.getId());
            }
        }

        for (final CreateScheduleSectionDataDto sectionData : sectionsData) {
            final ScheduleSection section = new ScheduleSection();
            section.setScheduleId(savedSchedule.getId());
            section.setDayNumber(sectionData.getDayNumber());
            section.setSectionType(sectionData.getSectionType());
            section.setStartTime(sectionData.getStartTime());
            final ScheduleSection savedSection = this.scheduleSectionRepository.save(section);

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
                    this.scheduleItemRepository.save(item);
                }
            }
        }

        log.info("Saved schedule {} with {} sections", savedSchedule.getId(), sectionsData.size());
        return savedSchedule.getId();
    }


    @Transactional
    public Integer updateScheduleWithSections(final Integer scheduleId, final String name,
        final List<CreateScheduleSectionDataDto> sectionsData, final Integer pdfExtractionId) {
        log.debug("Updating schedule {} with name '{}' and {} sections", scheduleId, name, sectionsData.size());

        final Optional<Schedule> scheduleOpt = this.scheduleRepository.findById(scheduleId);
        if (scheduleOpt.isEmpty()) {
            throw new IllegalArgumentException("Schedule not found: " + scheduleId);
        }

        final Schedule schedule = scheduleOpt.get();
        schedule.setName(name);
        schedule.setPdfExtractionId(pdfExtractionId);
        schedule.setUpdatedAt(LocalDateTime.now());
        this.scheduleRepository.save(schedule);

        if (pdfExtractionId != null) {
            final Optional<PDFExtraction> pdfOpt = this.pdfExtractionRepository.findById(pdfExtractionId);
            if (pdfOpt.isPresent()) {
                final PDFExtraction pdf = pdfOpt.get();
                pdf.setStatus("linked");
                pdf.setLinkedAt(LocalDateTime.now());
                pdf.setExpiresAt(null);
                this.pdfExtractionRepository.save(pdf);
                log.info("PDF extraction {} linked to schedule {}", pdfExtractionId, scheduleId);
            }
        }

        this.scheduleSectionRepository.deleteAllByScheduleId(scheduleId);

        for (final CreateScheduleSectionDataDto sectionData : sectionsData) {
            final ScheduleSection section = new ScheduleSection();
            section.setScheduleId(scheduleId);
            section.setDayNumber(sectionData.getDayNumber());
            section.setSectionType(sectionData.getSectionType());
            section.setStartTime(sectionData.getStartTime());
            final ScheduleSection savedSection = this.scheduleSectionRepository.save(section);

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
                    this.scheduleItemRepository.save(item);
                }
            }
        }

        log.info("Updated schedule {} with {} sections", scheduleId, sectionsData.size());
        return scheduleId;
    }


    @Transactional
    public Integer createScheduleSection(final CreateScheduleSectionDataDto data) {
        log.debug("Creating schedule section for schedule {}: day {}, type {}", data
            .getScheduleId(), data.getDayNumber(), data.getSectionType());

        final ScheduleSection section = new ScheduleSection();
        section.setScheduleId(data.getScheduleId());
        section.setDayNumber(data.getDayNumber());
        section.setSectionType(data.getSectionType());
        section.setStartTime(data.getStartTime());

        final ScheduleSection saved = this.scheduleSectionRepository.save(section);
        log.info("Created schedule section with id: {}", saved.getId());

        return saved.getId();
    }


    @Transactional
    public List<ScheduleSectionDto> getScheduleSections(final Integer scheduleId) {
        log.debug("Getting schedule sections for schedule id: {}", scheduleId);

        final List<ScheduleSection> sections = this.scheduleSectionRepository.findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(
            scheduleId);

        Objects.requireNonNull(this.scheduleMapper);
        final List<ScheduleSectionDto> result = sections.stream().map(this.scheduleMapper::toDto).toList();

        log.debug("Found {} sections for schedule {}", result.size(), scheduleId);
        return result;
    }


    @Transactional
    public List<ScheduleItemWithRaceAndSectionDto> getScheduleItemsBySection(final Integer sectionId) {
        log.debug("Getting schedule items for section id: {}", sectionId);

        final List<ScheduleItem> items = this.scheduleItemRepository.findAllBySectionIdWithRaceAndLevelAndSection(sectionId);

        if (items.isEmpty()) {
            return new ArrayList<>();
        }

        final String sectionStartTime = (items.getFirst().getSection() != null) ? items.getFirst().getSection().getStartTime() : "08:00";

        return this.scheduleMapper.mapItemsWithRaceAndSectionAndCalculatedTime(items, sectionStartTime);
    }


    @Transactional
    public Optional<ScheduleWithSectionsDto> getScheduleWithSections(final Integer scheduleId) {
        log.debug("Getting schedule with sections for id: {}", scheduleId);

        final Optional<Schedule> scheduleOpt = this.scheduleRepository.findByIdWithSections(scheduleId);

        if (scheduleOpt.isEmpty()) {
            log.debug("Schedule not found: {}", scheduleId);
            return Optional.empty();
        }

        final Schedule schedule = scheduleOpt.get();

        final List<ScheduleItem> scheduleItems = this.scheduleItemRepository.findAllByScheduleIdWithRaceAndLevel(scheduleId);

        for (final ScheduleItem item : scheduleItems) {
            final Integer sectionId = item.getSectionId();
            schedule.getSections().stream()
                .filter(section -> section.getId().equals(sectionId))
                .findFirst()
                .ifPresent(section -> section.getScheduleItems().add(item));
        }

        final ScheduleWithSectionsDto result = this.scheduleMapper.toScheduleWithSectionsDto(schedule);

        log.debug("Found schedule {} with {} sections and {} total items", scheduleId,
            (result.getSections() != null) ? result.getSections().size() : 0,
            scheduleItems.size());
        return Optional.of(result);
    }


    @Transactional
    public ScheduleWithPDFContextDto getScheduleWithPDFContext(final Integer scheduleId) {
        log.debug("Getting schedule with PDF context for id: {}", scheduleId);

        final Optional<ScheduleWithSectionsDto> scheduleOpt = getScheduleWithSections(scheduleId);

        final ScheduleWithPDFContextDto result = new ScheduleWithPDFContextDto();
        result.setSchedule(scheduleOpt.orElse(null));

        if (scheduleOpt.isEmpty()) {
            result.setHasPDFData(Boolean.FALSE);
            return result;
        }

        final ScheduleWithSectionsDto schedule = scheduleOpt.get();
        final boolean hasPDFData = (schedule.getPdfExtractionId() != null);
        final Integer pdfExtractionId = schedule.getPdfExtractionId();

        result.setPdfExtractionId(pdfExtractionId);
        result.setHasPDFData(hasPDFData);

        if (hasPDFData) {
            log.info("Schedule {} has linked PDF data (extraction ID: {}) - competitor-aware features available", scheduleId,
                pdfExtractionId);
        } else {

            log.debug("Schedule {} has no PDF data - standard scheduling mode", scheduleId);
        }

        return result;
    }


    @Transactional
    public void deleteSchedule(final Integer scheduleId) {
        log.debug("Deleting schedule: {}", scheduleId);

        this.scheduleItemRepository.deleteAllByScheduleId(scheduleId);

        this.scheduleSectionRepository.deleteAllByScheduleId(scheduleId);

        this.scheduleRepository.deleteById(scheduleId);

        log.info("Schedule {} and all associated data deleted successfully", scheduleId);
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\impl\ScheduleServiceImpl.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */