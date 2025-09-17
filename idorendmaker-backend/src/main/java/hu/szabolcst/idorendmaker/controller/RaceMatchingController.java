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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for PDF processing and race matching operations
 * Maps TypeScript IPC handlers to HTTP endpoints
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pdf")
public class RaceMatchingController {

    private final RaceMatchingService raceMatchingService;

    /**
     * Process PDF extraction result and store competitor data with race matching
     * Equivalent to IPC: 'pdf:processAndMatch'
     * TypeScript: processPDFAndMatch(filename: string, pdfData: ProcessedVersenyszam[], filePath?: string, onProgress?: callback): Promise<PDFProcessingResult>
     */
    @PostMapping("/process-and-match")
    public ResponseEntity<PDFProcessingResultDto> processPDFAndMatch(@RequestBody final ProcessPDFRequest request) {
        log.debug("POST /api/pdf/process-and-match - Processing PDF {} with {} races",
                 request.getFilename(), request.getPdfData().size());

        final PDFProcessingResultDto result = raceMatchingService.processPDFAndMatch(
                request.getFilename(), request.getPdfData(), request.getFileHash());

        log.info("Processed PDF {} with extraction id: {}", request.getFilename(), result.getPdfExtractionId());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Get filtered races with competitor data for a PDF extraction
     * Equivalent to IPC: 'pdf:getFilteredRaces'
     * TypeScript: getFilteredRaces(pdfExtractionId: number): Promise<RaceWithCompetitorData[]>
     */
    @GetMapping("/extractions/{id}/filtered-races")
    public ResponseEntity<List<RaceWithCompetitorDataDto>> getFilteredRaces(@PathVariable final Integer id) {
        log.debug("GET /api/pdf/extractions/{}/filtered-races - Getting filtered races", id);
        
        final List<RaceWithCompetitorDataDto> races = raceMatchingService.getFilteredRaces(id);
        
        log.debug("Found {} filtered races for extraction {}", races.size(), id);
        return ResponseEntity.ok(races);
    }

    /**
     * Get competitor data and schedules for a PDF extraction
     * Equivalent to IPC: 'pdf:getCompetitorData'
     * TypeScript: getCompetitorData(pdfExtractionId: number): Promise<Map<string, any>>
     */
    @GetMapping("/extractions/{id}/competitor-data")
    public ResponseEntity<Map<String, CompetitorDataDto>> getCompetitorData(@PathVariable final Integer id) {
        log.debug("GET /api/pdf/extractions/{}/competitor-data - Getting competitor data", id);
        
        final Map<String, CompetitorDataDto> competitorData = raceMatchingService.getCompetitorData(id);
        
        log.debug("Found competitor data for {} competitors in extraction {}", competitorData.size(), id);
        return ResponseEntity.ok(competitorData);
    }

    /**
     * Get PDF extraction statistics
     * Equivalent to IPC: 'pdf:getExtractionStats'
     * TypeScript: getPDFExtractionStats(pdfExtractionId: number)
     */
    @GetMapping("/extractions/{id}/stats")
    public ResponseEntity<PDFExtractionStatsDto> getPDFExtractionStats(@PathVariable final Integer id) {
        log.debug("GET /api/pdf/extractions/{}/stats - Getting extraction statistics", id);
        
        final PDFExtractionStatsDto stats = raceMatchingService.getPDFExtractionStats(id);
        
        log.debug("Extraction {} stats - matched races: {}, total entries: {}", 
                 id, stats.getMatchedRaces(), stats.getTotalEntries());
        return ResponseEntity.ok(stats);
    }

    /**
     * Link PDF extraction to a schedule (promote from session to permanent)
     * Called internally when schedule is saved with PDF data
     * Note: This might be called internally by ScheduleService, but exposed for completeness
     */
    @PostMapping("/extractions/{id}/link")
    public ResponseEntity<Void> linkToSchedule(@PathVariable final Integer id) {
        log.debug("POST /api/pdf/extractions/{}/link - Linking extraction to schedule", id);
        
        raceMatchingService.linkToSchedule(id);
        
        log.info("Linked PDF extraction {} to schedule", id);
        return ResponseEntity.ok().build();
    }

    /**
     * Clean up expired session data
     * Equivalent to IPC: 'pdf:cleanupExpiredSessions'
     * TypeScript: cleanupExpiredSessions(): Promise<{deletedExtractions: number, deletedRecords: number}>
     */
    @PostMapping("/cleanup-expired")
    public ResponseEntity<PDFCleanupResultDto> cleanupExpiredSessions() {
        log.debug("POST /api/pdf/cleanup-expired - Cleaning up expired sessions");
        
        final PDFCleanupResultDto result = raceMatchingService.cleanupExpiredSessions();
        
        log.info("Cleaned up {} expired extractions, deleted {} records", 
                result.getDeletedExtractions(), result.getDeletedRecords());
        return ResponseEntity.ok(result);
    }

    /**
     * Get all PDF extractions with metadata for the PDF manager
     * Equivalent to IPC: 'pdf:getAllExtractions'
     * TypeScript: getAllPDFExtractions()
     */
    @GetMapping("/extractions")
    public ResponseEntity<List<PDFExtractionDto>> getAllPDFExtractions() {
        log.debug("GET /api/pdf/extractions - Getting all PDF extractions");
        
        final List<PDFExtractionDto> extractions = raceMatchingService.getAllPDFExtractions();
        
        log.debug("Found {} PDF extractions", extractions.size());
        return ResponseEntity.ok(extractions);
    }

    /**
     * Delete a PDF extraction and all related data
     * Equivalent to IPC: 'pdf:deleteExtraction'
     * TypeScript: deletePDFExtraction(pdfExtractionId: number)
     */
    @DeleteMapping("/extractions/{id}")
    public ResponseEntity<PDFDeletionResultDto> deletePDFExtraction(@PathVariable final Integer id) {
        log.debug("DELETE /api/pdf/extractions/{} - Deleting PDF extraction", id);

        final PDFDeletionResultDto result = raceMatchingService.deletePDFExtraction(id);

        if (result.getSuccess()) {
            log.info("Deleted PDF extraction {}", id);
            return ResponseEntity.ok(result);
        } else {
            log.warn("Failed to delete PDF extraction {}: {}", id, result.getError());
            return ResponseEntity.badRequest().body(result);
        }
    }

    // Request DTOs for endpoints that need them
    @Data
    public static class ProcessPDFRequest {

        private String filename;
        private List<ProcessedVersenyszamDto> pdfData;
        private String fileHash;

    }
}
