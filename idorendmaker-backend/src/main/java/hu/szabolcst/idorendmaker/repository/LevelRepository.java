package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Level;
import java.util.List;

public interface LevelRepository {

    List<Level> findAllByOrderBySortOrderAsc();

    Level findFirstByIsDefaultTrue();

    List<Level> findAllByLevelTypeOrderBySortOrder(String paramString);
}