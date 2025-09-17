package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorConflictResultDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorScheduleDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorStatsDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.RaceCompetitorSummaryDto;
import hu.szabolcst.idorendmaker.model.dto.competitor.ScheduleRaceDto;
import hu.szabolcst.idorendmaker.service.CompetitorService;
import java.util.List;
import lombok.Data;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/competitors"})
public class CompetitorController {

    private final CompetitorService competitorService;

    @PostMapping({"/analyze"})
    public ResponseEntity<List<CompetitorScheduleDto>> analyzeCompetitorSchedules(@RequestBody final AnalyzeScheduleRequest request) {
        log.debug("POST /api/competitors/analyze - Analyzing {} schedule races with PDF extraction id: {}",
            request.getScheduleRaces().size(), request.getPdfExtractionId());

        final List<CompetitorScheduleDto> analysis = competitorService.analyzeCompetitorSchedules(request
            .getScheduleRaces(), request.getPdfExtractionId());

        log.debug("Analyzed competitor schedules, found {} competitor entries", analysis.size());
        return ResponseEntity.ok(analysis);
    }

    @GetMapping({"/conflicts"})
    public ResponseEntity<CompetitorConflictResultDto> checkCompetitorConflicts(@RequestParam("race1Id") final Integer race1Id,
        @RequestParam("race2Id") final Integer race2Id,
        @RequestParam(value = "pdfExtractionId", required = false) final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/conflicts?race1Id={}&race2Id={}&pdfExtractionId={} - Checking competitor conflicts",
            race1Id, race2Id, pdfExtractionId);

        final CompetitorConflictResultDto conflicts = competitorService.checkCompetitorConflicts(race1Id, race2Id, pdfExtractionId);

        log.debug("Found conflict result - hasConflicts: {}, conflicting competitors: {}", conflicts
            .getHasConflicts(), conflicts.getConflictingCompetitors().size());
        return ResponseEntity.ok(conflicts);
    }

    @GetMapping({"/races/{raceId}/summary"})
    public ResponseEntity<RaceCompetitorSummaryDto> getRaceCompetitorSummary(@PathVariable final Integer raceId,
        @RequestParam(value = "pdfExtractionId", required = false) final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/races/{}/summary?pdfExtractionId={} - Getting race competitor summary", raceId, pdfExtractionId);

        final RaceCompetitorSummaryDto summary = competitorService.getRaceCompetitorSummary(raceId, pdfExtractionId);

        log.debug("Found race summary - competitor count: {}", summary.getEntryCount());
        return ResponseEntity.ok(summary);
    }

    @GetMapping({"/high-risk"})
    public ResponseEntity<List<CompetitorScheduleDto>> getHighRiskCompetitors(
        @RequestParam("pdfExtractionId") final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/high-risk?pdfExtractionId={} - Getting high risk competitors", pdfExtractionId);

        final List<CompetitorScheduleDto> highRiskCompetitors = competitorService.getHighRiskCompetitors(pdfExtractionId);

        log.debug("Found {} high risk competitors", highRiskCompetitors.size());
        return ResponseEntity.ok(highRiskCompetitors);
    }


    @GetMapping({"/stats"})
    public ResponseEntity<CompetitorStatsDto> getCompetitorStats(@RequestParam("pdfExtractionId") final Integer pdfExtractionId) {
        log.debug("GET /api/competitors/stats?pdfExtractionId={} - Getting competitor statistics", pdfExtractionId);

        final CompetitorStatsDto stats = competitorService.getCompetitorStats(pdfExtractionId);

        log.debug("Competitor stats - total competitors: {}, total entries: {}", stats
            .getTotalCompetitors(), stats.getTotalEntries());
        return ResponseEntity.ok(stats);
    }

    @Data
    public static class AnalyzeScheduleRequest {

        private List<ScheduleRaceDto> scheduleRaces;
        private Integer pdfExtractionId;

    }

}