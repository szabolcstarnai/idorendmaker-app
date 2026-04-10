package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PDFExtractionRepository extends JpaRepository<PDFExtraction, Integer> {

    Optional<PDFExtraction> findByFileHash(String fileHash);

    @EntityGraph(attributePaths = {"schedules"})
    @Query("SELECT DISTINCT p FROM PDFExtraction p ORDER BY p.createdAt DESC")
    List<PDFExtraction> findAllWithSchedulesOrderByCreatedAtDesc();

    @Query("SELECT p FROM PDFExtraction p WHERE p.status = 'session' AND p.expiresAt < :cutoff")
    List<PDFExtraction> findExpiredSessionExtractions(@Param("cutoff") LocalDateTime cutoff);

    @EntityGraph(attributePaths = {"schedules"})
    @Query("SELECT DISTINCT p FROM PDFExtraction p WHERE p.id = :id")
    Optional<PDFExtraction> findByIdWithSchedules(@Param("id") Integer id);

    long countByStatus(String status);

    List<PDFExtraction> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT p FROM PDFExtraction p WHERE p.status = 'session' "
        + "AND NOT EXISTS (SELECT 1 FROM Schedule s WHERE s.pdfExtractionId = p.id)")
    List<PDFExtraction> findDeletableExtractions();
}
