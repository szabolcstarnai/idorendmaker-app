package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.BoatClass;
import java.util.List;
import java.util.Optional;

public interface BoatClassRepository {

    List<BoatClass> findAllByOrderByNameAsc();

    List<String> findDistinctBoatTypes();

    List<String> findDistinctSeatCountTexts();

    BoatClass findByName(String name);

    Optional<BoatClass> findById(Integer id);

    long count();
}