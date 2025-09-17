package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import java.util.List;

public interface ScheduleSectionRepository {

    ScheduleSection save(ScheduleSection entity);

    List<ScheduleSection> findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(Integer paramInteger);

    void deleteAllByScheduleId(Integer paramInteger);
}