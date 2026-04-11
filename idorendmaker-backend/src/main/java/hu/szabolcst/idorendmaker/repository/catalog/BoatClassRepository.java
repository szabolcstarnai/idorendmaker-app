package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.BoatClass;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface BoatClassRepository extends Repository<BoatClass, String> {
    Optional<BoatClass> findById(String code);

    List<BoatClass> findAll();

    List<BoatClass> findAllByBoatTypeCode(String boatTypeCode);
}
