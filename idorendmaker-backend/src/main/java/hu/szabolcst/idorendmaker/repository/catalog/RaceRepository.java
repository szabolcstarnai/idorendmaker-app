package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface RaceRepository extends Repository<Race, String> {
    Optional<Race> findById(String code);

    List<Race> findAll();

    List<Race> findAllByHidden(Boolean hidden);

    List<Race> findAllByBoatClassCode(String boatClassCode);
}
