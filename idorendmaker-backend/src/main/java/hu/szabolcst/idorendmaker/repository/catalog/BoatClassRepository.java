package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.BoatClass;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface BoatClassRepository extends Repository<BoatClass, String> {
    Optional<BoatClass> findById(String code);

    List<BoatClass> findAll();

    List<BoatClass> findAllByBoatTypeCode(String boatTypeCode);

    List<BoatClass> findAllByOrderByNameAsc();

    Optional<BoatClass> findByName(String name);

    /**
     * Distinct {@code boat_type_code} values across all boat classes. The
     * legacy repository returned distinct {@code boatType} free-text values;
     * the catalog schema replaced that free-text with an FK, so callers that
     * want display names should query {@link BoatTypeRepository} instead.
     */
    @Query("SELECT DISTINCT b.boatTypeCode FROM BoatClass b "
        + "WHERE b.boatTypeCode IS NOT NULL ORDER BY b.boatTypeCode")
    List<String> findDistinctBoatTypeCodes();

    @Query("SELECT DISTINCT b.seatCountText FROM BoatClass b "
        + "WHERE b.seatCountText IS NOT NULL ORDER BY b.seatCountText")
    List<String> findDistinctSeatCountTexts();
}
