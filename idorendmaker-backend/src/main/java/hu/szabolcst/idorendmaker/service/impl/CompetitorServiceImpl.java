package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.CompetitorMapper;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorRacePairDetailsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import hu.szabolcst.idorendmaker.repository.CompetitorEntryRepository;
import hu.szabolcst.idorendmaker.repository.RaceCompetitorAssociationRepository;
import hu.szabolcst.idorendmaker.service.CompetitorService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetitorServiceImpl implements CompetitorService {

	private final CompetitorEntryRepository competitorEntryRepository;
	private final RaceCompetitorAssociationRepository raceCompetitorAssociationRepository;
	private final CompetitorMapper competitorMapper;

	@Override
	@Transactional
	public List<CompetitorScheduleDto> analyzeCompetitorSchedules(final List<ScheduleRaceDto> scheduleRaces,
			final Integer pdfExtractionId) {
		if (pdfExtractionId == null) {
			return List.of(); // No competitor data available
		}

		try {
			// Get competitor data for this PDF extraction
			final List<CompetitorEntry> competitors =
					competitorEntryRepository.findAllWithRaceAssociationsByPdfExtractionId(pdfExtractionId);

			final List<CompetitorScheduleDto> competitorSchedules = new ArrayList<>();

			for (final CompetitorEntry competitor : competitors) {
				// Find races this competitor is entered in from the current schedule
				final List<ScheduleRaceDto> allCompetitorRaces = scheduleRaces.stream()
						.filter(scheduleRace -> competitor.getRaceCompetitorAssociations().stream()
								.anyMatch(assoc -> Objects.equals(assoc.getRaceCode(), scheduleRace.getRaceCode())))
						.toList();

                if (allCompetitorRaces.isEmpty()) {
                    continue;
                }

				// NEW ALGORITHM: Include ALL races and analyze gaps between meaningful pairs
				// No longer selecting "worst case heats" - instead showing all potential conflict scenarios
				final List<ScheduleRaceDto> competitorRaces = new ArrayList<>(allCompetitorRaces);

				// Sort races by scheduled time
				competitorRaces.sort(Comparator.comparing(ScheduleRaceDto::getStartTime));

				// Calculate race details with gap analysis between meaningful pairs
				final List<CompetitorRacePairDetailsDto> raceDetails = analyzeCompetitorRacePairs(competitorRaces);

				// Calculate overall statistics
				final List<Integer> intervals = raceDetails.stream()
						.map(CompetitorRacePairDetailsDto::getIntervalToNext)
						.filter(Objects::nonNull)
						.toList();

				final Integer shortestInterval =
						intervals.isEmpty() ? null : intervals.stream().min(Integer::compare).orElse(null);
				final Integer longestInterval =
						intervals.isEmpty() ? null : intervals.stream().max(Integer::compare).orElse(null);

				// Determine risk level
				String riskLevel = "low";
				final long criticalCount =
						raceDetails.stream().filter(r -> "critical".equals(r.getConflictLevel())).count();
				final long warningCount =
						raceDetails.stream().filter(r -> "warning".equals(r.getConflictLevel())).count();

				if (criticalCount > 0) {
					riskLevel = "high";
				} else if (warningCount > 0) {
					riskLevel = "medium";
				}

				final CompetitorScheduleDto competitorSchedule = competitorMapper.toCompetitorScheduleDto(
						competitor,
						raceDetails,
						raceDetails.size(),
						shortestInterval,
						longestInterval,
						riskLevel
				);
				competitorSchedules.add(competitorSchedule);
			}

			// Sort by risk level and total races (high risk first, then most races)
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

	@Override
	@Transactional
	public CompetitorConflictResultDto checkCompetitorConflicts(final String race1Code, final String race2Code,
			final Integer pdfExtractionId) {
		if (pdfExtractionId == null) {
			return competitorMapper.toCompetitorConflictResultDto(false, List.of(), 0);
		}

		try {
			// Find competitors entered in both races
			final List<RaceCompetitorAssociation> conflictingAssociations = raceCompetitorAssociationRepository
					.findConflictingCompetitorsBetweenRaceCodes(pdfExtractionId, race1Code, race2Code);

			final List<String> conflictingCompetitors =
					competitorMapper.extractCompetitorNames(conflictingAssociations);

			return competitorMapper.toCompetitorConflictResultDto(
					!conflictingCompetitors.isEmpty(),
					conflictingCompetitors,
					conflictingCompetitors.size()
			);
		} catch (final Exception error) {
			log.error("Error checking competitor conflicts", error);
			return competitorMapper.toCompetitorConflictResultDto(false, List.of(), 0);
		}
	}

	@Override
	@Transactional
	public RaceCompetitorSummaryDto getRaceCompetitorSummary(final String raceCode, final Integer pdfExtractionId) {
		if (pdfExtractionId == null) {
			return competitorMapper.toRaceCompetitorSummaryDto(0, List.of(), List.of());
		}

		try {
			final List<RaceCompetitorAssociation> associations = raceCompetitorAssociationRepository
					.findByPdfExtractionIdAndRaceCodeWithCompetitor(pdfExtractionId, raceCode);

			// Orphaned associations (competitor row deleted) have a null transient entry; skip them.
			final List<RaceCompetitorAssociation> withCompetitor = associations.stream()
					.filter(assoc -> assoc.getCompetitorEntry() != null)
					.toList();

			final List<String> topCompetitors = withCompetitor.stream()
					.limit(3)
					.map(assoc -> assoc.getCompetitorEntry().getCompetitorName())
					.toList();

			final List<String> organizations = withCompetitor.stream()
					.map(assoc -> assoc.getCompetitorEntry().getOrganization())
					.filter(Objects::nonNull)
					.distinct()
					.toList();

			return competitorMapper.toRaceCompetitorSummaryDto(
					associations.size(),
					topCompetitors,
					organizations
			);
		} catch (final Exception error) {
			log.error("Error getting race competitor summary", error);
			return competitorMapper.toRaceCompetitorSummaryDto(0, List.of(), List.of());
		}
	}

	@Override
	@Transactional
	public Map<String, RaceCompetitorSummaryDto> getBatchRaceCompetitorSummary(final List<String> raceCodes, final Integer pdfExtractionId) {
		final Map<String, RaceCompetitorSummaryDto> result = new HashMap<>();

		if (pdfExtractionId == null || raceCodes == null || raceCodes.isEmpty()) {
			// Return empty summaries for all requested race codes
			if (raceCodes != null) {
				raceCodes.forEach(raceCode -> result.put(raceCode, competitorMapper.toRaceCompetitorSummaryDto(0, List.of(), List.of())));
			}
			return result;
		}

		try {
			// Get all associations for all races in a single query
			final List<RaceCompetitorAssociation> allAssociations = raceCompetitorAssociationRepository
					.findByPdfExtractionIdAndRaceCodesWithCompetitor(pdfExtractionId, raceCodes);

			// Group associations by race code
			final Map<String, List<RaceCompetitorAssociation>> associationsByRace = allAssociations.stream()
					.collect(Collectors.groupingBy(RaceCompetitorAssociation::getRaceCode));

			// Process each race
			for (final String raceCode : raceCodes) {
				final List<RaceCompetitorAssociation> associations = associationsByRace.getOrDefault(raceCode, List.of());

				// Orphaned associations (competitor row deleted) have a null transient entry; skip them.
				final List<RaceCompetitorAssociation> withCompetitor = associations.stream()
						.filter(assoc -> assoc.getCompetitorEntry() != null)
						.toList();

				final List<String> topCompetitors = withCompetitor.stream()
						.limit(3)
						.map(assoc -> assoc.getCompetitorEntry().getCompetitorName())
						.toList();

				final List<String> organizations = withCompetitor.stream()
						.map(assoc -> assoc.getCompetitorEntry().getOrganization())
						.filter(Objects::nonNull)
						.distinct()
						.toList();

				final RaceCompetitorSummaryDto summary = competitorMapper.toRaceCompetitorSummaryDto(
						associations.size(),
						topCompetitors,
						organizations
				);

				result.put(raceCode, summary);
			}

			return result;
		} catch (final Exception error) {
			log.error("Error getting batch race competitor summaries", error);
			// Return empty summaries for all requested race codes in case of error
			raceCodes.forEach(raceCode -> result.put(raceCode, competitorMapper.toRaceCompetitorSummaryDto(0, List.of(), List.of())));
			return result;
		}
	}

	@Override
	@Transactional
	public List<CompetitorScheduleDto> getHighRiskCompetitors(final Integer pdfExtractionId) {
		final List<CompetitorScheduleDto> allSchedules = analyzeCompetitorSchedules(List.of(), pdfExtractionId);
		return allSchedules.stream()
				.filter(schedule -> "high".equals(schedule.getRiskLevel()))
				.toList();
	}

	@Override
	@Transactional
	public CompetitorStatsDto getCompetitorStats(final Integer pdfExtractionId) {
		try {
			// Total unique competitors
			final long totalCompetitors = competitorEntryRepository.countByPdfExtractionId(pdfExtractionId);

			// Total race entries
			final long totalEntries = raceCompetitorAssociationRepository.countByPdfExtractionId(pdfExtractionId);

			// Unique races with entries
			final List<String> raceCodes =
					raceCompetitorAssociationRepository.findDistinctRaceCodesByPdfExtractionId(pdfExtractionId);
			final int racesWithEntries = raceCodes.size();

			// Organizations represented
			final List<String> organizations =
					competitorEntryRepository.findDistinctOrganizationsByPdfExtractionId(pdfExtractionId);
			final int organizationsRepresented = organizations.size();

			return competitorMapper.toCompetitorStatsDto(
					(int) totalCompetitors,
					(int) totalEntries,
					racesWithEntries,
					organizationsRepresented
			);
		} catch (final Exception error) {
			log.error("Error getting competitor stats", error);
			return competitorMapper.toCompetitorStatsDto(0, 0, 0, 0);
		}
	}

	// Helper methods

	/**
	 * Analyze gaps between all meaningful race pairs for a competitor
	 * NEW ALGORITHM: Include all races, analyze gaps between pairs with different race-leveltype
	 * Skip gaps between same race-leveltype (e.g., Előfutam I vs Előfutam II of same race)
	 */
	private List<CompetitorRacePairDetailsDto> analyzeCompetitorRacePairs(final List<ScheduleRaceDto> competitorRaces) {
		final List<CompetitorRacePairDetailsDto> raceDetails = new ArrayList<>();

		for (int i = 0; i < competitorRaces.size(); i++) {
			final ScheduleRaceDto currentRace = competitorRaces.get(i);

			// Find the next meaningful race (different race-leveltype) for interval calculation
			ScheduleRaceDto nextMeaningfulRace = null;
			Integer intervalToNext = null;
			Integer recoveryTime = null;

			for (int j = i + 1; j < competitorRaces.size(); j++) {
				final ScheduleRaceDto candidateRace = competitorRaces.get(j);
                if (!Objects.equals(currentRace.getDay(), candidateRace.getDay())) {
                    continue; // different day, cannot be conflict
                }
				// Check if this is a meaningful pair (different race-leveltype)
				if (isDifferentRaceLevelType(currentRace, candidateRace)) {
					nextMeaningfulRace = candidateRace;
					intervalToNext = calculateMinutesBetween(currentRace.getStartTime(), candidateRace.getStartTime());
					recoveryTime = intervalToNext - 5; // Assume 5 minutes average race duration
					break; // Take the first (chronologically next) meaningful race
				}
			}

			// Determine conflict level based on recovery time
			String conflictLevel = "none";
			if (recoveryTime != null) {
				if (recoveryTime < 30) {
					conflictLevel = "critical";
				} else if (recoveryTime < 60) {
					conflictLevel = "warning";
				}
			}

            final CompetitorRacePairDetailsDto racePairDetail = CompetitorRacePairDetailsDto.builder()
                .race1Code(currentRace.getRaceCode())
                .levelType1(currentRace.getLevelType())
                .level1Code(currentRace.getLevelCode())
                .race1Name(buildRaceDisplayName(currentRace))
                .race1StartTime(currentRace.getStartTime())
                .race2Code(nextMeaningfulRace != null ? nextMeaningfulRace.getRaceCode() : null)
                .levelType2(nextMeaningfulRace != null ? nextMeaningfulRace.getLevelType() : null)
                .level2Code(nextMeaningfulRace != null ? nextMeaningfulRace.getLevelCode() : null)
                .race2Name(nextMeaningfulRace != null ? buildRaceDisplayName(nextMeaningfulRace) : null)
                .race2StartTime(nextMeaningfulRace != null ? nextMeaningfulRace.getStartTime() : null)
                .estimatedDuration(5)
                .intervalToNext(intervalToNext)
                .recoveryTime(recoveryTime)
                .conflictLevel(conflictLevel)
                .build();
            raceDetails.add(racePairDetail);
		}

        return raceDetails.stream()
            .filter(dto -> dto.getRace2Code() != null)
            .collect(Collectors.groupingBy(dto ->
                dto.getRace1Code() + "-" + dto.getLevelType1() + ";" + dto.getRace2Code() + "-" + dto.getLevelType2()))
            .values().stream()
            .map(competitorRaceDetailsDtos -> competitorRaceDetailsDtos.stream()
                .min(Comparator.comparing(CompetitorRacePairDetailsDto::getIntervalToNext)))
            .map(optional -> optional.orElse(null))
            .filter(Objects::nonNull)
            .toList();
	}

	/**
	 * Build a display name for a ScheduleRaceDto from its snapshot fields.
	 * Falls back gracefully when either name is missing.
	 */
	private String buildRaceDisplayName(final ScheduleRaceDto race) {
		final String raceName = race.getRaceName();
		final String levelName = race.getLevelName();
		if (raceName == null && levelName == null) {
			return race.getRaceCode();
		}
		if (levelName == null || levelName.isBlank()) {
			return raceName;
		}
		if (raceName == null || raceName.isBlank()) {
			return levelName;
		}
		return raceName + " " + levelName;
	}

	/**
	 * Check if two races have different race-leveltype combinations
	 * Returns true if they represent meaningful conflict scenarios
	 * Returns false if they're the same race-leveltype (e.g., Előfutam I vs Előfutam II of same race)
	 */
	private boolean isDifferentRaceLevelType(final ScheduleRaceDto race1, final ScheduleRaceDto race2) {
		final String race1Key = race1.getRaceCode() + "-" + race1.getLevelType();
		final String race2Key = race2.getRaceCode() + "-" + race2.getLevelType();
		return !race1Key.equals(race2Key);
	}

	/**
	 * Calculate minutes between two time strings (HH:MM format)
	 */
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
