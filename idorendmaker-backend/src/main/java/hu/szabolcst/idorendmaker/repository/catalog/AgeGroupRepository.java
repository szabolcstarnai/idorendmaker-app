package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.AgeGroup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface AgeGroupRepository extends Repository<AgeGroup, String> {
    Optional<AgeGroup> findById(String code);

    List<AgeGroup> findAll();

    long count();

    List<AgeGroup> findAllByOrderByNameAsc();
}
