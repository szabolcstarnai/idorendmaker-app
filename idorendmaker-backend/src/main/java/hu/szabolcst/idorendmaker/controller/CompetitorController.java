package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import hu.szabolcst.idorendmaker.service.CompetitorService;
import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Competitor operations
 * Maps TypeScript IPC handlers to HTTP endpoints
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/competitors")
public class CompetitorController {

    private final CompetitorService competitorService;

    /**
     * Analyze competitor schedules from a set of schedule races
     * Equivalent to IPC: 'competitor:analyzeSchedules'
     */
    @PostMapping("/analyze")
    public ResponseEntity<List<CompetitorScheduleDto>> analyzeCompetitorSchedules(
            @RequestBody final AnalyzeScheduleRequest request) {
        log.debug("POST /api/competitors/analyze - Analyzing {} schedule races with PDF extraction id: {}",
                 request.getScheduleRaces().size(), request.getPdfExtractionId());

        final List<CompetitorScheduleDto> analysis = competitorService.analyzeCompetitorSchedules(
                request.getScheduleRaces(), request.getPdfExtractionId());

        log.debug("Analyzed competitor schedules, found {} competitor entries", analysis.size());
        return ResponseEntity.ok(analysis);
    }

    /**
     * Check for competitor conflicts between two specific races.
     * Equivalent to IPC: 'competitor:checkConflicts'
     */
    @GetMapping("/conflicts")
    public ResponseEntity<CompetitorConflictResultDto> checkCompetitorConflicts(
            @RequestParam("race1Code") final String race1Code,
            @RequestParam("race2Code") final String race2Code,
            @RequestParam(value = "pdfExtractionId", required = false) final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/conflicts?race1Code={}&race2Code={}&pdfExtractionId={} - Checking competitor conflicts",
                 race1Code, race2Code, pdfExtractionId);

        final CompetitorConflictResultDto conflicts = competitorService.checkCompetitorConflicts(
                race1Code, race2Code, pdfExtractionId);

        log.debug("Found conflict result - hasConflicts: {}, conflicting competitors: {}",
                 conflicts.getHasConflicts(), conflicts.getConflictingCompetitors().size());
        return ResponseEntity.ok(conflicts);
    }

    /**
     * Get competitor summary for a race.
     * Equivalent to IPC: 'competitor:getRaceSummary'
     */
    @GetMapping("/races/{raceCode}/summary")
    public ResponseEntity<RaceCompetitorSummaryDto> getRaceCompetitorSummary(
            @PathVariable final String raceCode,
            @RequestParam(value = "pdfExtractionId", required = false) final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/races/{}/summary?pdfExtractionId={} - Getting race competitor summary",
                 raceCode, pdfExtractionId);

        final RaceCompetitorSummaryDto summary = competitorService.getRaceCompetitorSummary(raceCode, pdfExtractionId);

        log.debug("Found race summary - competitor count: {}", summary.getEntryCount());
        return ResponseEntity.ok(summary);
    }

    /**
     * Get competitor summaries for multiple races in a single call (batch operation).
     */
    @PostMapping("/races/batch-summary")
    public ResponseEntity<Map<String, RaceCompetitorSummaryDto>> getBatchRaceCompetitorSummary(
            @RequestBody final BatchSummaryRequest request) {
        log.debug("POST /api/competitors/races/batch-summary - Getting batch race competitor summaries for {} races with PDF extraction id: {}",
                 request.getRaceCodes().size(), request.getPdfExtractionId());

        final Map<String, RaceCompetitorSummaryDto> summaries = competitorService.getBatchRaceCompetitorSummary(
                request.getRaceCodes(), request.getPdfExtractionId());

        log.debug("Retrieved batch summaries for {} races", summaries.size());
        return ResponseEntity.ok(summaries);
    }

    /**
     * Get competitors at high risk (tight schedules).
     * Equivalent to IPC: 'competitor:getHighRiskCompetitors'
     */
    @GetMapping("/high-risk")
    public ResponseEntity<List<CompetitorScheduleDto>> getHighRiskCompetitors(
            @RequestParam("pdfExtractionId") final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/high-risk?pdfExtractionId={} - Getting high risk competitors", pdfExtractionId);

        final List<CompetitorScheduleDto> highRiskCompetitors = competitorService.getHighRiskCompetitors(pdfExtractionId);

        log.debug("Found {} high risk competitors", highRiskCompetitors.size());
        return ResponseEntity.ok(highRiskCompetitors);
    }

    /**
     * Get competitor entry statistics for a PDF extraction.
     * Equivalent to IPC: 'competitor:getStats'
     */
    @GetMapping("/stats")
    public ResponseEntity<CompetitorStatsDto> getCompetitorStats(
            @RequestParam("pdfExtractionId") final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/stats?pdfExtractionId={} - Getting competitor statistics", pdfExtractionId);

        final CompetitorStatsDto stats = competitorService.getCompetitorStats(pdfExtractionId);

        log.debug("Competitor stats - total competitors: {}, total entries: {}",
                 stats.getTotalCompetitors(), stats.getTotalEntries());
        return ResponseEntity.ok(stats);
    }

    // Request DTOs for endpoints that need them
    @Data
    public static class AnalyzeScheduleRequest {
        private List<ScheduleRaceDto> scheduleRaces;
        private Integer pdfExtractionId;
    }

    @Data
    public static class BatchSummaryRequest {
        private List<String> raceCodes;
        private Integer pdfExtractionId;
    }
}
