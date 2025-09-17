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

public interface RaceMatchingService {
  PDFProcessingResultDto processPDFAndMatch(String paramString1, List<ProcessedVersenyszamDto> paramList, String paramString2);
  
  List<RaceWithCompetitorDataDto> getFilteredRaces(Integer paramInteger);
  
  Map<String, CompetitorDataDto> getCompetitorData(Integer paramInteger);
  
  PDFExtractionStatsDto getPDFExtractionStats(Integer paramInteger);
  
  void linkToSchedule(Integer paramInteger);
  
  PDFCleanupResultDto cleanupExpiredSessions();
  
  List<PDFExtractionDto> getAllPDFExtractions();
  
  PDFDeletionResultDto deletePDFExtraction(Integer paramInteger);
  
  String calculateFileHash(String paramString);
  
  void matchRacesToDatabase(List<ExtractedRaceDto> paramList, Integer paramInteger);
  
  void storeCompetitorEntries(Integer paramInteger, List<ExtractedRaceDto> paramList);
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\RaceMatchingService.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */