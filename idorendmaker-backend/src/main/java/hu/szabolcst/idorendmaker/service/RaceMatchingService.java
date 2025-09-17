package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.matching.CompetitorDataDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ExtractedRaceDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFCleanupResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFDeletionResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFExtractionStatsDto;
import hu.szabolcst.idorendmaker.model.dto.matching.PDFProcessingResultDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ProcessedVersenyszamDto;
import hu.szabolcst.idorendmaker.model.dto.matching.RaceWithCompetitorDataDto;
import java.util.List;
import java.util.Map;

/**
 * Service interface for PDF processing and race matching operations
 * Handles all database operations related to PDF extractions and competitor data
 * Replaces TypeScript RaceMatchingService functionality for Prisma elimination
 */
public interface RaceMatchingService {

    /**
     * Process PDF extraction result and store competitor data with race matching
     * Includes deduplication based on file hash
     * Equivalent to TypeScript: RaceMatchingService.processPDFAndMatch(filename: string, pdfData: ProcessedVersenyszam[], filePath?: string): Promise<PDFProcessingResult>
     * Equivalent to IPC: 'pdf:processAndMatch'
     * 
     * @param filename Original PDF filename
     * @param pdfData Extracted race data from PDFProcessor
     * @param fileHash SHA-256 hash for deduplication (optional)
     * @return Processing result with extraction ID and statistics
     */
    PDFProcessingResultDto processPDFAndMatch(String filename, List<ProcessedVersenyszamDto> pdfData, 
                                              String fileHash);

    /**
     * Get filtered races with competitor data for a PDF extraction
     * Returns only races that have actual competitor entries (50-200 vs 2400+ total races)
     * Equivalent to TypeScript: RaceMatchingService.getFilteredRaces(pdfExtractionId: number): Promise<RaceWithCompetitorData[]>
     * Equivalent to IPC: 'pdf:getFilteredRaces'
     */
    List<RaceWithCompetitorDataDto> getFilteredRaces(Integer pdfExtractionId);

    /**
     * Get competitor data and schedules for a PDF extraction
     * Returns Map of competitorId -> competitor data for analysis
     * Equivalent to TypeScript: RaceMatchingService.getCompetitorData(pdfExtractionId: number): Promise<Map<string, any>>
     * Equivalent to IPC: 'pdf:getCompetitorData'
     */
    Map<String, CompetitorDataDto> getCompetitorData(Integer pdfExtractionId);

    /**
     * Get PDF extraction statistics
     * Equivalent to TypeScript: RaceMatchingService.getPDFExtractionStats(pdfExtractionId: number)
     * Equivalent to IPC: 'pdf:getExtractionStats'
     */
    PDFExtractionStatsDto getPDFExtractionStats(Integer pdfExtractionId);

    /**
     * Link PDF extraction to a schedule (promote from session to permanent)
     * Equivalent to TypeScript: RaceMatchingService.linkToSchedule(pdfExtractionId: number): Promise<void>
     * Called internally when schedule is saved with PDF data
     */
    void linkToSchedule(Integer pdfExtractionId);

    /**
     * Clean up expired session data
     * Removes PDF extractions that are in 'session' status and have expired
     * Equivalent to TypeScript: RaceMatchingService.cleanupExpiredSessions(): Promise<{deletedExtractions: number, deletedRecords: number}>
     * Equivalent to IPC: 'pdf:cleanupExpiredSessions'
     */
    PDFCleanupResultDto cleanupExpiredSessions();

    /**
     * Get all PDF extractions with metadata for the PDF manager
     * Equivalent to TypeScript: RaceMatchingService.getAllPDFExtractions()
     * Equivalent to IPC: 'pdf:getAllExtractions'
     */
    List<PDFExtractionDto> getAllPDFExtractions();

    /**
     * Delete a PDF extraction and all related data
     * Only allows deletion of session data not linked to any schedules
     * Equivalent to TypeScript: RaceMatchingService.deletePDFExtraction(pdfExtractionId: number)
     * Equivalent to IPC: 'pdf:deleteExtraction'
     */
    PDFDeletionResultDto deletePDFExtraction(Integer pdfExtractionId);

    /**
     * Calculate SHA-256 hash of file content for deduplication
     * Used internally by processPDFAndMatch
     * Equivalent to TypeScript: RaceMatchingService.calculateFileHash(filePath: string): Promise<string>
     */
    String calculateFileHash(String filePath);

    /**
     * Match extracted race names to database races using normalized comparison
     * Used internally by processPDFAndMatch for race matching logic
     * Equivalent to TypeScript: RaceMatchingService.matchRacesToDatabase(extractedRaces: ExtractedRace[]): Promise<void>
     */
    void matchRacesToDatabase(List<ExtractedRaceDto> extractedRaces, Integer pdfExtractionId);

    /**
     * Store competitor entries in database from PDF extraction
     * Used internally by processPDFAndMatch
     * Equivalent to TypeScript: RaceMatchingService.storeCompetitorEntries(pdfExtractionId: number, extractedRaces: ExtractedRace[]): Promise<void>
     */
    void storeCompetitorEntries(Integer pdfExtractionId, List<ExtractedRaceDto> extractedRaces);
}
