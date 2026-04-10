package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleSectionRepository extends JpaRepository<ScheduleSection, Integer> {

    List<ScheduleSection> findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(Integer scheduleId);

    void deleteAllByScheduleId(Integer scheduleId);
    // save(entity) inherited
}
