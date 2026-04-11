package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.BoatType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface BoatTypeRepository extends Repository<BoatType, String> {
    Optional<BoatType> findById(String code);

    List<BoatType> findAll();
}
