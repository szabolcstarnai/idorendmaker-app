package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Race;
import java.util.List;

public interface RaceRepository {

    List<Race> findAllWithAgeGroupsOrdered();

    List<Race> findBySearchTermWithAgeGroups(String paramString);
}