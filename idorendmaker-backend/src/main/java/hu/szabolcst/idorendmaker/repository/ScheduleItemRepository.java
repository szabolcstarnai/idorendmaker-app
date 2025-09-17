package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import java.util.List;

public interface ScheduleItemRepository {

    List<ScheduleItem> findAllByScheduleIdWithRaceAndLevel(Integer paramInteger);

    List<ScheduleItem> findAllBySectionIdWithRaceAndLevelAndSection(Integer paramInteger);

    void deleteAllByScheduleId(Integer paramInteger);

    void deleteAllBySectionId(Integer paramInteger);
}