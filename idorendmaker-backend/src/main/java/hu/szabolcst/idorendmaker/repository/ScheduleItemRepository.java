package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScheduleItemRepository extends JpaRepository<ScheduleItem, Integer> {

    @Query("SELECT si FROM ScheduleItem si "
        + "WHERE si.scheduleId = :scheduleId "
        + "ORDER BY si.orderIndex ASC")
    List<ScheduleItem> findAllByScheduleIdOrderByOrderIndex(@Param("scheduleId") Integer scheduleId);

    @EntityGraph(attributePaths = {"section"})
    @Query("SELECT si FROM ScheduleItem si "
        + "WHERE si.sectionId = :sectionId "
        + "ORDER BY si.orderIndex ASC")
    List<ScheduleItem> findAllBySectionIdOrderByOrderIndexWithSection(@Param("sectionId") Integer sectionId);

    @Modifying
    @Query("DELETE FROM ScheduleItem si WHERE si.scheduleId = :scheduleId")
    void deleteAllByScheduleId(@Param("scheduleId") Integer scheduleId);

    @Modifying
    @Query("DELETE FROM ScheduleItem si WHERE si.sectionId = :sectionId")
    void deleteAllBySectionId(@Param("sectionId") Integer sectionId);
}
