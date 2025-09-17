package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Schedule;
import java.util.List;
import java.util.Optional;

public interface ScheduleRepository {

    List<Schedule> findAllByOrderByCreatedAtDesc();

    Optional<Schedule> findByIdWithSections(Integer paramInteger);
}