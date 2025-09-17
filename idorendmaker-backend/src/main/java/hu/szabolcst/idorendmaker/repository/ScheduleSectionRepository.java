package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import java.util.List;

public interface ScheduleSectionRepository {

    List<ScheduleSection> findAllByScheduleIdOrderByDayNumberAscSectionTypeAsc(Integer paramInteger);

    void deleteAllByScheduleId(Integer paramInteger);
}