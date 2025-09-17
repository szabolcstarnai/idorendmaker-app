package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.AgeGroup;
import java.util.List;

public interface AgeGroupRepository {

    List<AgeGroup> findAllByOrderByNameAsc();

    long count();
}