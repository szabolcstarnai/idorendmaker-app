package hu.szabolcst.idorendmaker.repository.catalog;

import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

public interface RaceRepository extends Repository<Race, String> {
    Optional<Race> findById(String code);

    List<Race> findAll();

    long count();

    List<Race> findAllByHidden(Boolean hidden);

    List<Race> findAllByBoatClassCode(String boatClassCode);

    /**
     * All races, ordered deterministically. The legacy query ordered by
     * {@code occurrence DESC, name ASC}; the new catalog Race has no
     * {@code occurrence} field, so we fall back to {@code sortOrder ASC,
     * name ASC}. {@code sortOrder} is the catalog's primary ordering hint.
     */
    @Query("SELECT r FROM Race r ORDER BY r.sortOrder ASC, r.name ASC")
    List<Race> findAllOrdered();

    /**
     * Text search across the scalar fields of Race. Age-group and
     * boat-class-name search terms are not handled here because the catalog
     * Race no longer has JPA relationships to those tables; the service
     * layer does cross-entity stitching if needed.
     */
    @Query("SELECT r FROM Race r "
        + "WHERE LOWER(r.name) LIKE LOWER(CONCAT('%', :searchTerm, '%')) "
        + "OR LOWER(r.discipline) LIKE LOWER(CONCAT('%', :searchTerm, '%')) "
        + "OR LOWER(r.gender) LIKE LOWER(CONCAT('%', :searchTerm, '%')) "
        + "OR LOWER(r.distance) LIKE LOWER(CONCAT('%', :searchTerm, '%')) "
        + "OR LOWER(r.boatClassCode) LIKE LOWER(CONCAT('%', :searchTerm, '%')) "
        + "ORDER BY r.sortOrder ASC, r.name ASC")
    List<Race> searchByTerm(@Param("searchTerm") String searchTerm);
}
