package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Service interface for Competitor operations
 * Provides all functionality matching the TypeScript CompetitorService
 */
@Service
public interface CompetitorService {

    /**
     * Analyze competitor schedules from a set of schedule races.
     * Equivalent to TypeScript: analyzeCompetitorSchedules(scheduleRaces, pdfExtractionId?)
     * Equivalent to IPC: 'competitor:analyzeSchedules'
     *
     * <p>For each competitor, includes every race they appear in and computes
     * gaps between chronologically consecutive races that differ by
     * (raceCode, levelType). Gaps between repeated heats of the same
     * race-leveltype pair (e.g. Előfutam I vs. Előfutam II of the same race)
     * are skipped. Recovery time below configured thresholds classifies the
     * pair as {@code warning} or {@code critical}.
     */
    List<CompetitorScheduleDto> analyzeCompetitorSchedules(List<ScheduleRaceDto> scheduleRaces, Integer pdfExtractionId);

    /**
     * Check for competitor conflicts between two specific races.
     * Equivalent to TypeScript: checkCompetitorConflicts(race1Code, race2Code, pdfExtractionId?)
     * Equivalent to IPC: 'competitor:checkConflicts'
     */
    CompetitorConflictResultDto checkCompetitorConflicts(String race1Code, String race2Code, Integer pdfExtractionId);

    /**
     * Get competitor summary for a race.
     * Equivalent to TypeScript: getRaceCompetitorSummary(raceCode, pdfExtractionId?)
     * Equivalent to IPC: 'competitor:getRaceSummary'
     */
    RaceCompetitorSummaryDto getRaceCompetitorSummary(String raceCode, Integer pdfExtractionId);

    /**
     * Get competitor summaries for multiple races in a single call (batch).
     * Optimized for performance when multiple race summaries are needed.
     * Returns a map keyed by race code.
     */
    Map<String, RaceCompetitorSummaryDto> getBatchRaceCompetitorSummary(List<String> raceCodes, Integer pdfExtractionId);

    /**
     * Get competitors at high risk (tight schedules).
     * Equivalent to IPC: 'competitor:getHighRiskCompetitors'
     */
    List<CompetitorScheduleDto> getHighRiskCompetitors(Integer pdfExtractionId);

    /**
     * Get competitor entry statistics for a PDF extraction.
     * Equivalent to IPC: 'competitor:getStats'
     */
    CompetitorStatsDto getCompetitorStats(Integer pdfExtractionId);
}
