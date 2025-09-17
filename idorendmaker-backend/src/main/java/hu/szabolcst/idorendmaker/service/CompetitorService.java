package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Service interface for Competitor operations
 * Provides all functionality matching the TypeScript CompetitorService
 */
@Service
public interface CompetitorService {

    /**
     * Analyze competitor schedules from a set of schedule races
     * Equivalent to TypeScript: analyzeCompetitorSchedules(scheduleRaces: ScheduleRace[], pdfExtractionId?: number): Promise<CompetitorSchedule[]>
     * Equivalent to IPC: 'competitor:analyzeSchedules'
     * 
     * Implements sophisticated "worst case scenario" logic for multiple heats:
     * - Groups races by (race.id, level.levelType) to identify multiple heats
     * - For each group with multiple heats, assumes competitor is in the heat that creates worst scheduling conflict
     * - Ensures conservative safety margins while eliminating false positives
     */
    List<CompetitorScheduleDto> analyzeCompetitorSchedules(List<ScheduleRaceDto> scheduleRaces, Integer pdfExtractionId);

    /**
     * Check for competitor conflicts between two specific races
     * Equivalent to TypeScript: checkCompetitorConflicts(race1Id: number, race2Id: number, pdfExtractionId?: number)
     * Equivalent to IPC: 'competitor:checkConflicts'
     */
    CompetitorConflictResultDto checkCompetitorConflicts(Integer race1Id, Integer race2Id, Integer pdfExtractionId);

    /**
     * Get competitor summary for a race
     * Equivalent to TypeScript: getRaceCompetitorSummary(raceId: number, pdfExtractionId?: number)
     * Equivalent to IPC: 'competitor:getRaceSummary'
     */
    RaceCompetitorSummaryDto getRaceCompetitorSummary(Integer raceId, Integer pdfExtractionId);

    /**
     * Get competitors at high risk (tight schedules)
     * Equivalent to TypeScript: getHighRiskCompetitors(pdfExtractionId: number): Promise<CompetitorSchedule[]>
     * Equivalent to IPC: 'competitor:getHighRiskCompetitors'
     */
    List<CompetitorScheduleDto> getHighRiskCompetitors(Integer pdfExtractionId);

    /**
     * Get competitor entry statistics for a PDF extraction
     * Equivalent to TypeScript: getCompetitorStats(pdfExtractionId: number)
     * Equivalent to IPC: 'competitor:getStats'
     */
    CompetitorStatsDto getCompetitorStats(Integer pdfExtractionId);
}
