package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Schedule;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository {

    Optional<Schedule> findById(Integer id);

    void deleteById(Integer id);

    List<Schedule> findAllByOrderByCreatedAtDesc();

    Optional<Schedule> findByIdWithSections(Integer paramInteger);

    Schedule save(Schedule entity);

    long count();

    long countByPdfExtractionId(Integer pdfExtractionId);
}