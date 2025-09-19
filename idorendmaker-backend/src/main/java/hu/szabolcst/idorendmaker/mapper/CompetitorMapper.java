package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorRacePairDetailsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import java.util.List;
import org.mapstruct.Mapper;

@Mapper
public interface CompetitorMapper {

    default CompetitorScheduleDto toCompetitorScheduleDto(final CompetitorEntry competitor, final List<CompetitorRacePairDetailsDto> races,
        final Integer totalRaces, final Integer shortestInterval, final Integer longestInterval, final String riskLevel) {
        final CompetitorScheduleDto dto = new CompetitorScheduleDto();
        dto.setCompetitorId(competitor.getCompetitorId());
        dto.setCompetitorName(competitor.getCompetitorName());
        dto.setOrganization(competitor.getOrganization());
        dto.setBirthYear(competitor.getBirthYear());
        dto.setRacePairs(races);
        dto.setTotalRaces(totalRaces);
        dto.setShortestInterval(shortestInterval);
        dto.setLongestInterval(longestInterval);
        dto.setRiskLevel(riskLevel);
        return dto;
    }

    default CompetitorConflictResultDto toCompetitorConflictResultDto(final Boolean hasConflicts, final List<String> conflictingCompetitors,
        final Integer competitorCount) {
        final CompetitorConflictResultDto dto = new CompetitorConflictResultDto();
        dto.setHasConflicts(hasConflicts);
        dto.setConflictingCompetitors(conflictingCompetitors);
        dto.setCompetitorCount(competitorCount);
        return dto;
    }

    default RaceCompetitorSummaryDto toRaceCompetitorSummaryDto(final Integer entryCount, final List<String> topCompetitors,
        final List<String> organizations) {
        final RaceCompetitorSummaryDto dto = new RaceCompetitorSummaryDto();
        dto.setEntryCount(entryCount);
        dto.setTopCompetitors(topCompetitors);
        dto.setOrganizations(organizations);
        return dto;
    }

    default CompetitorStatsDto toCompetitorStatsDto(final Integer totalCompetitors, final Integer totalEntries,
        final Integer racesWithEntries,
        final Integer organizationsRepresented) {
        final CompetitorStatsDto dto = new CompetitorStatsDto();
        dto.setTotalCompetitors(totalCompetitors);
        dto.setTotalEntries(totalEntries);
        dto.setRacesWithEntries(racesWithEntries);
        dto.setOrganizationsRepresented(organizationsRepresented);
        return dto;
    }

    default List<String> extractCompetitorNames(final List<RaceCompetitorAssociation> associations) {
        if (associations == null) {
            return List.of();
        }
        return associations.stream()
            .map(assoc -> assoc.getCompetitorEntry().getCompetitorName())
            .toList();
    }

}