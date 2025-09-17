package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.matching.CompetitorDataDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFCleanupResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFDeletionResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionStatsDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFProcessingResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ProcessedVersenyszamDto;
import hu.szabolcst.idorendmaker.model.dto.matching.RaceWithCompetitorDataDto;
import hu.szabolcst.idorendmaker.service.RaceMatchingService;
import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/pdf"})
public class RaceMatchingController {

    private final RaceMatchingService raceMatchingService;

    @PostMapping({"/process-and-match"})
    public ResponseEntity<PDFProcessingResultDto> processPDFAndMatch(@RequestBody final ProcessPDFRequest request) {
        log.debug("POST /api/pdf/process-and-match - Processing PDF {} with {} races", request
            .getFilename(), request.getPdfData().size());

        final PDFProcessingResultDto result = this.raceMatchingService.processPDFAndMatch(request
            .getFilename(), request.getPdfData(), request.getFileHash());

        log.info("Processed PDF {} with extraction id: {}", request.getFilename(), result.getPdfExtractionId());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping({"/extractions/{id}/filtered-races"})
    public ResponseEntity<List<RaceWithCompetitorDataDto>> getFilteredRaces(@PathVariable final Integer id) {
        log.debug("GET /api/pdf/extractions/{}/filtered-races - Getting filtered races", id);

        final List<RaceWithCompetitorDataDto> races = this.raceMatchingService.getFilteredRaces(id);

        log.debug("Found {} filtered races for extraction {}", races.size(), id);
        return ResponseEntity.ok(races);
    }

    @GetMapping({"/extractions/{id}/competitor-data"})
    public ResponseEntity<Map<String, CompetitorDataDto>> getCompetitorData(@PathVariable final Integer id) {
        log.debug("GET /api/pdf/extractions/{}/competitor-data - Getting competitor data", id);

        final Map<String, CompetitorDataDto> competitorData = this.raceMatchingService.getCompetitorData(id);

        log.debug("Found competitor data for {} competitors in extraction {}", competitorData.size(), id);
        return ResponseEntity.ok(competitorData);
    }

    @GetMapping({"/extractions/{id}/stats"})
    public ResponseEntity<PDFExtractionStatsDto> getPDFExtractionStats(@PathVariable final Integer id) {
        log.debug("GET /api/pdf/extractions/{}/stats - Getting extraction statistics", id);

        final PDFExtractionStatsDto stats = this.raceMatchingService.getPDFExtractionStats(id);

        log.debug("Extraction {} stats - matched races: {}, total entries: {}", id, stats
            .getMatchedRaces(), stats.getTotalEntries());
        return ResponseEntity.ok(stats);
    }

    @PostMapping({"/extractions/{id}/link"})
    public ResponseEntity<Void> linkToSchedule(@PathVariable final Integer id) {
        log.debug("POST /api/pdf/extractions/{}/link - Linking extraction to schedule", id);

        this.raceMatchingService.linkToSchedule(id);

        log.info("Linked PDF extraction {} to schedule", id);
        return ResponseEntity.ok().build();
    }

    @PostMapping({"/cleanup-expired"})
    public ResponseEntity<PDFCleanupResultDto> cleanupExpiredSessions() {
        log.debug("POST /api/pdf/cleanup-expired - Cleaning up expired sessions");

        final PDFCleanupResultDto result = this.raceMatchingService.cleanupExpiredSessions();

        log.info("Cleaned up {} expired extractions, deleted {} records", result
            .getDeletedExtractions(), result.getDeletedRecords());
        return ResponseEntity.ok(result);
    }

    @GetMapping({"/extractions"})
    public ResponseEntity<List<PDFExtractionDto>> getAllPDFExtractions() {
        log.debug("GET /api/pdf/extractions - Getting all PDF extractions");

        final List<PDFExtractionDto> extractions = this.raceMatchingService.getAllPDFExtractions();

        log.debug("Found {} PDF extractions", extractions.size());
        return ResponseEntity.ok(extractions);
    }

    @DeleteMapping({"/extractions/{id}"})
    public ResponseEntity<PDFDeletionResultDto> deletePDFExtraction(@PathVariable final Integer id) {
        log.debug("DELETE /api/pdf/extractions/{} - Deleting PDF extraction", id);

        final PDFDeletionResultDto result = this.raceMatchingService.deletePDFExtraction(id);

        if (result.getSuccess()) {
            log.info("Deleted PDF extraction {}", id);
            return ResponseEntity.ok(result);
        }
        log.warn("Failed to delete PDF extraction {}: {}", id, result.getError());
        return ResponseEntity.badRequest().body(result);
    }

    @Data
    public static class ProcessPDFRequest {

        private String filename;
        private List<ProcessedVersenyszamDto> pdfData;
        private String fileHash;

    }
}