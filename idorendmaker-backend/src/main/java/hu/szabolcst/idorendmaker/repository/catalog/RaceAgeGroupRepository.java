package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.RaceAgeGroup;
import hu.szabolcst.idorendmaker.model.entity.catalog.RaceAgeGroupId;
import java.util.List;
import org.springframework.data.repository.Repository;

public interface RaceAgeGroupRepository extends Repository<RaceAgeGroup, RaceAgeGroupId> {
    List<RaceAgeGroup> findAll();

    List<RaceAgeGroup> findAllByRaceCode(String raceCode);

    List<RaceAgeGroup> findAllByAgeGroupCode(String ageGroupCode);
}
