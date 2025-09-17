package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.matching.CompetitorDataDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedCompetitorDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedRaceDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFCleanupResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFDeletionResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionStatsDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFProcessingResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ProcessedVersenyszamDto;
import hu.szabolcst.idorendmaker.model.dto.matching.RaceWithCompetitorDataDto;
import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;
import org.mapstruct.Named;


@Mapper(uses = {RaceMapper.class, CompetitorMapper.class})
public interface RaceMatchingMapper {

    @Mappings({@Mapping(target = "linkedSchedules", source = "schedules", qualifiedByName = {"mapScheduleNames"}),
        @Mapping(target = "competitorEntriesCount", ignore = true), @Mapping(target = "raceAssociationsCount", ignore = true),
        @Mapping(target = "schedulesUsingCount", ignore = true), @Mapping(target = "canDelete", ignore = true)})
    PDFExtractionDto toPDFExtractionDto(PDFExtraction paramPDFExtraction);

    @Mapping(target = "matchedRaces", ignore = true)
    PDFExtractionStatsDto toPDFExtractionStatsDto(PDFExtraction paramPDFExtraction);

    ExtractedRaceDto toExtractedRaceDto(ExtractedRaceDto paramExtractedRaceDto);

    ExtractedCompetitorDto toExtractedCompetitorDto(ExtractedCompetitorDto paramExtractedCompetitorDto);

    @Mappings({@Mapping(target = "races", ignore = true), @Mapping(target = "totalRaces", ignore = true),
        @Mapping(target = "shortestInterval", ignore = true), @Mapping(target = "longestInterval", ignore = true),
        @Mapping(target = "riskLevel", ignore = true)})
    CompetitorScheduleDto toCompetitorScheduleDto(CompetitorEntry paramCompetitorEntry);

    @Mappings({@Mapping(target = "id", source = "competitorId"), @Mapping(target = "name", source = "competitorName"),
        @Mapping(target = "races", ignore = true)})
    CompetitorDataDto toCompetitorDataDto(CompetitorEntry paramCompetitorEntry);

    ProcessedVersenyszamDto toProcessedVersenyszamDto(ProcessedVersenyszamDto paramProcessedVersenyszamDto);

    @Mappings({@Mapping(target = "ageGroups", source = "ageGroups", qualifiedByName = {"mapRaceAgeGroups"}),
        @Mapping(target = "entryCount", ignore = true), @Mapping(target = "competitorIds", ignore = true),
        @Mapping(target = "topCompetitors", ignore = true), @Mapping(target = "pdfExtractionId", ignore = true)})
    RaceWithCompetitorDataDto toRaceWithCompetitorDataDto(Race paramRace);

    @Named("mapScheduleNames")
    default List<String> mapScheduleNames(final List<Schedule> schedules) {
        if (schedules == null) {
            return List.of();
        }
        return schedules.stream()
            .map(Schedule::getName)
            .toList();
    }

    default PDFProcessingResultDto createProcessingResultDto(final boolean success, final Integer pdfExtractionId,
        final List<ExtractedRaceDto> extractedRaces, final Integer totalCompetitors, final Integer totalEntries, final String error,
        final boolean wasDeduplication) {
        final PDFProcessingResultDto dto = new PDFProcessingResultDto();
        dto.setSuccess(success);
        dto.setPdfExtractionId(pdfExtractionId);
        dto.setExtractedRaces(extractedRaces);
        dto.setTotalCompetitors(totalCompetitors);
        dto.setTotalEntries(totalEntries);
        dto.setError(error);
        dto.setWasDeduplication(wasDeduplication);
        return dto;
    }

    default PDFCleanupResultDto createCleanupResultDto(final int deletedExtractions, final int deletedRecords) {
        final PDFCleanupResultDto dto = new PDFCleanupResultDto();
        dto.setDeletedExtractions(deletedExtractions);
        dto.setDeletedRecords(deletedRecords);
        return dto;
    }

    default PDFDeletionResultDto createDeletionResultDto(final boolean success, final String error) {
        final PDFDeletionResultDto dto = new PDFDeletionResultDto();
        dto.setSuccess(success);
        dto.setError(error);
        return dto;
    }

}