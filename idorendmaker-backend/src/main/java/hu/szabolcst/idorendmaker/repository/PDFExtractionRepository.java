package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PDFExtractionRepository {

    Optional<PDFExtraction> findByFileHash(String paramString);

    List<PDFExtraction> findAllWithSchedulesOrderByCreatedAtDesc();

    List<PDFExtraction> findExpiredSessionExtractions(LocalDateTime paramLocalDateTime);

    Optional<PDFExtraction> findByIdWithSchedules(Integer paramInteger);

    long countByStatus(String paramString);

    List<PDFExtraction> findByStatusOrderByCreatedAtDesc(String paramString);

    List<PDFExtraction> findDeletableExtractions();
}