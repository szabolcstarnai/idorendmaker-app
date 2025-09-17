package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Level;
import java.util.List;
import java.util.Optional;

public interface LevelRepository {

    Optional<Level> findById(Integer id);

    List<Level> findAllByOrderBySortOrderAsc();

    Level findFirstByIsDefaultTrue();

    List<Level> findAllByLevelTypeOrderBySortOrder(String paramString);
}