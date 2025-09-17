package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleItemDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.CreateScheduleSectionDataDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceAndSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleItemWithRaceDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleSectionWithItemsDto;
import hu.szabolcst.idorendmaker.model.dto.schedule.ScheduleWithSectionsDto;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import hu.szabolcst.idorendmaker.utils.ScheduleTimeCalculator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.Named;

@Mapper(uses = {RaceMapper.class, LevelMapper.class})
public interface ScheduleMapper {

    @Named("mapSectionsWithItems")
    default List<ScheduleSectionWithItemsDto> mapSectionsWithItems(final List<ScheduleSection> sections) {
        if (sections == null) {
            return null;
        }

        return sections.stream()
            .map(this::toScheduleSectionWithItemsDto)
            .toList();
    }

    @Named("mapItemsWithCalculatedTime")
    default List<ScheduleItemWithRaceDto> mapItemsWithCalculatedTime(final List<ScheduleItem> scheduleItems) {
        if (scheduleItems == null) {
            return new ArrayList<>();
        }

        final Map<Integer, List<ScheduleItem>> itemsBySection = scheduleItems.stream()
            .collect(Collectors.groupingBy(ScheduleItem::getSectionId));

        final List<ScheduleItemWithRaceDto> result = new ArrayList<>();

        for (final Map.Entry<Integer, List<ScheduleItem>> entry : itemsBySection.entrySet()) {
            final List<ScheduleItem> sectionItems = entry.getValue();

            sectionItems.sort(Comparator.comparingInt(ScheduleItem::getOrderIndex));

            final String sectionStartTime = sectionItems.isEmpty() ? "08:00"
                : ((sectionItems.get(0).getSection() != null) ? sectionItems.get(0).getSection()
                    .getStartTime() : "08:00");

            for (final ScheduleItem item : sectionItems) {
                final ScheduleItemWithRaceDto dto = toScheduleItemWithRaceDto(item);

                final List<Integer> intervals = sectionItems.subList(0, Math.max(0, item.getOrderIndex())).stream()
                    .map(ScheduleItem::getIntervalMinutes).toList();

                dto.setCalculatedStartTime(
                    ScheduleTimeCalculator.calculateStartTimeForOrderIndex(item
                        .getOrderIndex(), intervals, sectionStartTime));

                result.add(dto);
            }
        }

        return result;
    }


    default List<ScheduleItemWithRaceAndSectionDto> mapItemsWithRaceAndSectionAndCalculatedTime(final List<ScheduleItem> scheduleItems,
        final String sectionStartTime) {
        if (scheduleItems == null) {
            return new ArrayList<>();
        }

        final List<ScheduleItem> sortedItems = scheduleItems.stream().sorted(Comparator.comparingInt(ScheduleItem::getOrderIndex)).toList();

        final List<ScheduleItemWithRaceAndSectionDto> result = new ArrayList<>();

        for (final ScheduleItem item : sortedItems) {
            final ScheduleItemWithRaceAndSectionDto dto = toScheduleItemWithRaceAndSectionDto(item);

            final List<Integer> intervals = sortedItems.subList(0, item.getOrderIndex()).stream().map(ScheduleItem::getIntervalMinutes).toList();

            dto.setCalculatedStartTime(
                ScheduleTimeCalculator.calculateStartTimeForOrderIndex(item
                    .getOrderIndex(), intervals, sectionStartTime));

            result.add(dto);
        }

        return result;
    }

    ScheduleDto toDto(Schedule paramSchedule);

    ScheduleSectionDto toDto(ScheduleSection paramScheduleSection);

    @Mappings({@Mapping(target = "calculatedStartTime", ignore = true), @Mapping(target = "race", source = "race"),
        @Mapping(target = "level", source = "level"), @Mapping(target = "section", source = "section")})
    ScheduleItemWithRaceAndSectionDto toScheduleItemWithRaceAndSectionDto(ScheduleItem paramScheduleItem);

    @Mappings({@Mapping(target = "calculatedStartTime", ignore = true), @Mapping(target = "race", source = "race"),
        @Mapping(target = "level", source = "level")})
    ScheduleItemWithRaceDto toScheduleItemWithRaceDto(ScheduleItem paramScheduleItem);

    @Mapping(target = "sections", source = "sections", qualifiedByName = {"mapSectionsWithItems"})
    ScheduleWithSectionsDto toScheduleWithSectionsDto(Schedule paramSchedule);

    @Mapping(target = "items", source = "scheduleItems", qualifiedByName = {"mapItemsWithCalculatedTime"})
    ScheduleSectionWithItemsDto toScheduleSectionWithItemsDto(ScheduleSection paramScheduleSection);

    @Mapping(target = "scheduleId", source = "scheduleId")
    ScheduleSection toEntity(CreateScheduleSectionDataDto paramCreateScheduleSectionDataDto, Integer scheduleId);

    @Mappings({@Mapping(target = "id", ignore = true), @Mapping(target = "createdAt", ignore = true),
        @Mapping(target = "schedule", ignore = true), @Mapping(target = "scheduleItems", ignore = true),
        @Mapping(target = "scheduleId", source = "scheduleId")})
    ScheduleSection toScheduleSection(CreateScheduleSectionDataDto paramCreateScheduleSectionDataDto, Integer scheduleId);

    @Mappings({@Mapping(target = "id", ignore = true), @Mapping(target = "createdAt", ignore = true),
        @Mapping(target = "schedule", ignore = true), @Mapping(target = "section", ignore = true), @Mapping(target = "race", ignore = true),
        @Mapping(target = "level", ignore = true)})
    ScheduleItem toScheduleItem(CreateScheduleItemDataDto paramCreateScheduleItemDataDto, Integer scheduleId, Integer sectionId);

}