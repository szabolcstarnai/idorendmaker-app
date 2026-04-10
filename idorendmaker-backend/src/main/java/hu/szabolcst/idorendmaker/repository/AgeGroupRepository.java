package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.AgeGroup;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgeGroupRepository extends JpaRepository<AgeGroup, Integer> {

    List<AgeGroup> findAllByOrderByNameAsc();
    // count() inherited from JpaRepository
}
