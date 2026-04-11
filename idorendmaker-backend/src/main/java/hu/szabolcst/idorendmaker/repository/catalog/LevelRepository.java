package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.Level;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface LevelRepository extends Repository<Level, String> {
    Optional<Level> findById(String code);

    List<Level> findAll();

    List<Level> findAllByLevelType(String levelType);

    List<Level> findAllByOrderBySortOrderAsc();

    Optional<Level> findFirstByIsDefaultTrue();

    List<Level> findAllByLevelTypeOrderBySortOrderAsc(String levelType);
}
