package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Level;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LevelRepository extends JpaRepository<Level, Integer> {

    List<Level> findAllByOrderBySortOrderAsc();

    Level findFirstByIsDefaultTrue();

    List<Level> findAllByLevelTypeOrderBySortOrder(String levelType);
    // findById(Integer) inherited from JpaRepository
}
