package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Schedule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScheduleRepository extends JpaRepository<Schedule, Integer> {

    List<Schedule> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"sections", "pdfExtraction"})
    @Query("SELECT DISTINCT s FROM Schedule s WHERE s.id = :id")
    Optional<Schedule> findByIdWithSections(@Param("id") Integer id);

    long countByPdfExtractionId(Integer pdfExtractionId);
}
