package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.CompetitorMapper;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorRaceDetailsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import hu.szabolcst.idorendmaker.repository.jdbc.CompetitorEntryJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RaceCompetitorAssociationJdbcRepository;
import hu.szabolcst.idorendmaker.service.CompetitorService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetitorServiceImpl implements CompetitorService {

    private final CompetitorEntryJdbcRepository competitorEntryRepository;

    private final RaceCompetitorAssociationJdbcRepository raceCompetitorAssociationRepository;

    private final CompetitorMapper competitorMapper;


    @Transactional
    public List<CompetitorScheduleDto> analyzeCompetitorSchedules(final List<ScheduleRaceDto> scheduleRaces,
        final Integer pdfExtractionId) {
        if (pdfExtractionId == null) {
            return List.of();
        }

        try {
            final List<CompetitorEntry> competitors = this.competitorEntryRepository.findAllWithRaceAssociationsByPdfExtractionId(
                pdfExtractionId);

            final List<CompetitorScheduleDto> competitorSchedules = new ArrayList<>();

            for (final CompetitorEntry competitor : competitors) {

                final List<ScheduleRaceDto> allCompetitorRaces = scheduleRaces.stream()
                    .filter(scheduleRace -> competitor.getRaceCompetitorAssociations().stream()
                        .anyMatch(assoc -> Objects.equals(assoc.getRaceId(), scheduleRace.getRace().getId())))
                    .toList();

                if (allCompetitorRaces.isEmpty()) {
                    continue;
                }

                final Map<String, List<ScheduleRaceDto>> raceGroups = groupScheduleRacesByRaceAndLevel(allCompetitorRaces);
                final List<ScheduleRaceDto> competitorRaces = selectWorstCaseHeats(raceGroups, scheduleRaces);

                competitorRaces.sort(Comparator.comparing(ScheduleRaceDto::getStartTime));

                final List<CompetitorRaceDetailsDto> raceDetails = new ArrayList<>();
                for (int i = 0; i < competitorRaces.size(); i++) {
                    final ScheduleRaceDto race = competitorRaces.get(i);
                    final ScheduleRaceDto nextRace = (i < competitorRaces.size() - 1) ? competitorRaces.get(i + 1) : null;

                    Integer intervalToNext = null;
                    Integer recoveryTime = null;

                    if (nextRace != null) {
                        intervalToNext = calculateMinutesBetween(race.getStartTime(), nextRace.getStartTime());

                        recoveryTime = intervalToNext - 5;
                    }

                    String conflictLevel = "none";
                    if (recoveryTime != null) {
                        if (recoveryTime < 30) {
                            conflictLevel = "critical";
                        } else if (recoveryTime < 60) {
                            conflictLevel = "warning";
                        }
                    }

                    final CompetitorRaceDetailsDto raceDetail = this.competitorMapper.toCompetitorRaceDetailsDto(race
                            .getRace().getId(), race
                            .getRace().getName(), race
                            .getStartTime(),
                        5, intervalToNext, recoveryTime, conflictLevel);

                    raceDetails.add(raceDetail);
                }

                final List<Integer> intervals = raceDetails.stream().map(CompetitorRaceDetailsDto::getIntervalToNext)
                    .filter(Objects::nonNull).toList();

                final Integer shortestInterval = intervals.isEmpty() ? null : intervals.stream().min(Integer::compare).orElse(null);

                final Integer longestInterval = intervals.isEmpty() ? null : intervals.stream().max(Integer::compare).orElse(null);

                String riskLevel = "low";

                final long criticalCount = raceDetails.stream().filter(r -> "critical".equals(r.getConflictLevel())).count();

                final long warningCount = raceDetails.stream().filter(r -> "warning".equals(r.getConflictLevel())).count();

                if (criticalCount > 0L) {
                    riskLevel = "high";
                } else if (warningCount > 0L) {
                    riskLevel = "medium";
                }

                final CompetitorScheduleDto competitorSchedule = this.competitorMapper.toCompetitorScheduleDto(competitor, raceDetails,

                    raceDetails.size(), shortestInterval, longestInterval, riskLevel);

                competitorSchedules.add(competitorSchedule);
            }

            competitorSchedules.sort((a, b) -> {
                final Map<String, Integer> riskOrder = Map.of("high", 3, "medium", 2, "low", 1);

                final int riskDiff = riskOrder.get(b.getRiskLevel()) - riskOrder.get(a.getRiskLevel());

                return (riskDiff != 0) ? riskDiff : (b.getTotalRaces() - a.getTotalRaces());
            });
            log.info("Analyzed {} competitor schedules", competitorSchedules.size());
            return competitorSchedules;
        } catch (final Exception error) {
            log.error("Error analyzing competitor schedules", error);
            return List.of();
        }
    }


    @Transactional
    public CompetitorConflictResultDto checkCompetitorConflicts(final Integer race1Id, final Integer race2Id,
        final Integer pdfExtractionId) {
        if (pdfExtractionId == null) {
            return this.competitorMapper.toCompetitorConflictResultDto(Boolean.FALSE, List.of(), 0);
        }

        try {
            final List<RaceCompetitorAssociation> conflictingAssociations = this.raceCompetitorAssociationRepository.findConflictingCompetitorsBetweenRaces(
                pdfExtractionId, race1Id, race2Id);

            final List<String> conflictingCompetitors = this.competitorMapper.extractCompetitorNames(conflictingAssociations);

            return this.competitorMapper.toCompetitorConflictResultDto(
                !conflictingCompetitors.isEmpty(), conflictingCompetitors,

                conflictingCompetitors.size());
        } catch (final Exception error) {
            log.error("Error checking competitor conflicts", error);
            return this.competitorMapper.toCompetitorConflictResultDto(Boolean.FALSE, List.of(), 0);
        }
    }

    @Transactional
    public RaceCompetitorSummaryDto getRaceCompetitorSummary(final Integer raceId, final Integer pdfExtractionId) {
        if (pdfExtractionId == null) {
            return this.competitorMapper.toRaceCompetitorSummaryDto(0, List.of(), List.of());
        }

        try {
            final List<RaceCompetitorAssociation> associations = this.raceCompetitorAssociationRepository.findByPdfExtractionIdAndRaceIdWithCompetitor(
                pdfExtractionId, raceId);

            final List<String> topCompetitors = associations.stream().limit(3L).map(assoc -> assoc.getCompetitorEntry().getCompetitorName())
                .toList();

            final List<String> organizations = associations.stream().map(assoc -> assoc.getCompetitorEntry().getOrganization())
                .filter(Objects::nonNull).distinct().toList();

            return this.competitorMapper.toRaceCompetitorSummaryDto(
                associations.size(), topCompetitors, organizations);


        } catch (final Exception error) {
            log.error("Error getting race competitor summary", error);
            return this.competitorMapper.toRaceCompetitorSummaryDto(0, List.of(), List.of());
        }
    }


    @Transactional
    public List<CompetitorScheduleDto> getHighRiskCompetitors(final Integer pdfExtractionId) {
        final List<CompetitorScheduleDto> allSchedules = analyzeCompetitorSchedules(List.of(), pdfExtractionId);
        return allSchedules.stream()
            .filter(schedule -> "high".equals(schedule.getRiskLevel()))
            .toList();
    }


    @Transactional
    public CompetitorStatsDto getCompetitorStats(final Integer pdfExtractionId) {
        try {
            final long totalCompetitors = this.competitorEntryRepository.countByPdfExtractionId(pdfExtractionId);

            final long totalEntries = this.raceCompetitorAssociationRepository.countByPdfExtractionId(pdfExtractionId);

            final List<Integer> raceIds = this.raceCompetitorAssociationRepository.findDistinctRaceIdsByPdfExtractionId(pdfExtractionId);
            final int racesWithEntries = raceIds.size();

            final List<String> organizations = this.competitorEntryRepository.findDistinctOrganizationsByPdfExtractionId(pdfExtractionId);
            final int organizationsRepresented = organizations.size();

            return this.competitorMapper.toCompetitorStatsDto(
                (int) totalCompetitors,
                (int) totalEntries,
                racesWithEntries,
                organizationsRepresented);
        } catch (final Exception error) {
            log.error("Error getting competitor stats", error);
            return this.competitorMapper.toCompetitorStatsDto(0, 0, 0, 0);
        }
    }


    private Map<String, List<ScheduleRaceDto>> groupScheduleRacesByRaceAndLevel(final List<ScheduleRaceDto> scheduleRaces) {
        final Map<String, List<ScheduleRaceDto>> groups = new HashMap<>();

        for (final ScheduleRaceDto scheduleRace : scheduleRaces) {
            final String key = scheduleRace.getRace().getId() + "-" + scheduleRace.getRace().getId();
            groups.computeIfAbsent(key, k -> new ArrayList()).add(scheduleRace);
        }

        return groups;
    }


    private List<ScheduleRaceDto> selectWorstCaseHeats(final Map<String, List<ScheduleRaceDto>> raceGroups,
        final List<ScheduleRaceDto> allScheduleRaces) {
        final List<ScheduleRaceDto> selectedHeats = new ArrayList<>();

        for (final List<ScheduleRaceDto> heats : raceGroups.values()) {
            if (heats.size() == 1) {

                selectedHeats.add(heats.getFirst());

                continue;
            }

            final List<ScheduleRaceDto> sortedHeats = heats.stream().sorted(Comparator.comparing(ScheduleRaceDto::getStartTime)).toList();

            final Set<String> heatIds = heats.stream().map(ScheduleRaceDto::getId).collect(Collectors.toSet());

            final List<ScheduleRaceDto> otherRaces = allScheduleRaces.stream().filter(race -> !heatIds.contains(race.getId())).toList();

            if (otherRaces.isEmpty()) {

                selectedHeats.add(sortedHeats.getFirst());

                continue;
            }

            ScheduleRaceDto worstHeat = sortedHeats.getFirst();
            int worstRecoveryTime = Integer.MAX_VALUE;

            for (final ScheduleRaceDto heat : sortedHeats) {

                final ScheduleRaceDto conflictBefore = findClosestRaceBefore(heat, otherRaces);
                final ScheduleRaceDto conflictAfter = findClosestRaceAfter(heat, otherRaces);

                int minRecoveryTime = Integer.MAX_VALUE;

                if (conflictBefore != null) {

                    minRecoveryTime = calculateMinutesBetween(conflictBefore.getStartTime(), heat.getStartTime()) - 5;
                }

                if (conflictAfter != null) {
                    final int timeAfter = calculateMinutesBetween(heat.getStartTime(), conflictAfter.getStartTime()) - 5;

                    minRecoveryTime = Math.min(minRecoveryTime, timeAfter);
                }

                if (minRecoveryTime < worstRecoveryTime) {
                    worstRecoveryTime = minRecoveryTime;
                    worstHeat = heat;
                }
            }

            selectedHeats.add(worstHeat);
        }

        return selectedHeats;
    }


    private ScheduleRaceDto findClosestRaceBefore(final ScheduleRaceDto targetRace, final List<ScheduleRaceDto> otherRaces) {
        return otherRaces.stream()
            .filter(race -> (race.getStartTime().compareTo(targetRace.getStartTime()) < 0))
            .max(Comparator.comparing(ScheduleRaceDto::getStartTime))
            .orElse(null);
    }


    private ScheduleRaceDto findClosestRaceAfter(final ScheduleRaceDto targetRace, final List<ScheduleRaceDto> otherRaces) {
        return otherRaces.stream()
            .filter(race -> (race.getStartTime().compareTo(targetRace.getStartTime()) > 0))
            .min(Comparator.comparing(ScheduleRaceDto::getStartTime))
            .orElse(null);
    }


    private int calculateMinutesBetween(final String startTime, final String endTime) {
        final String[] startParts = startTime.split(":");
        final String[] endParts = endTime.split(":");

        final int startHours = Integer.parseInt(startParts[0]);
        final int startMinutes = Integer.parseInt(startParts[1]);
        final int endHours = Integer.parseInt(endParts[0]);
        final int endMinutes = Integer.parseInt(endParts[1]);

        final int startTotalMinutes = startHours * 60 + startMinutes;
        final int endTotalMinutes = endHours * 60 + endMinutes;

        return endTotalMinutes - startTotalMinutes;
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\impl\CompetitorServiceImpl.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */