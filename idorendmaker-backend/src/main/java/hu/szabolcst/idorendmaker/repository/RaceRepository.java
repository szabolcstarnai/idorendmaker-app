package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Race;
import java.util.List;
import java.util.Optional;

public interface RaceRepository {

    List<Race> findAllWithAgeGroupsOrdered();

    Optional<Race> findByIdWithAgeGroupsAndBoatClassData(Integer integer);

    List<Race> findBySearchTermWithAgeGroups(String paramString);

    List<Race> findAll();

    Optional<Race> findById(Integer paramInteger);

    Race save(Race paramRace);

    long count();
}