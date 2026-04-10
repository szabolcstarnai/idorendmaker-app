package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Race;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RaceRepository extends JpaRepository<Race, Integer> {

    @EntityGraph(attributePaths = {"ageGroups", "ageGroups.ageGroup", "boatClassData"})
    @Query("SELECT DISTINCT r FROM Race r ORDER BY r.occurrence DESC, r.name ASC")
    List<Race> findAllWithAgeGroupsOrdered();

    @EntityGraph(attributePaths = {"ageGroups", "ageGroups.ageGroup", "boatClassData"})
    @Query("SELECT DISTINCT r FROM Race r WHERE r.id = :id")
    Optional<Race> findByIdWithAgeGroupsAndBoatClassData(@Param("id") Integer id);

    @EntityGraph(attributePaths = {"ageGroups", "ageGroups.ageGroup", "boatClassData"})
    @Query("SELECT DISTINCT r FROM Race r "
        + "LEFT JOIN r.ageGroups rag "
        + "LEFT JOIN rag.ageGroup ag "
        + "LEFT JOIN r.boatClassData bc "
        + "WHERE r.name LIKE CONCAT('%', :searchTerm, '%') "
        + "OR r.discipline LIKE CONCAT('%', :searchTerm, '%') "
        + "OR r.boatClass LIKE CONCAT('%', :searchTerm, '%') "
        + "OR r.gender LIKE CONCAT('%', :searchTerm, '%') "
        + "OR r.distance LIKE CONCAT('%', :searchTerm, '%') "
        + "OR ag.name LIKE CONCAT('%', :searchTerm, '%') "
        + "OR bc.name LIKE CONCAT('%', :searchTerm, '%') "
        + "OR bc.boatType LIKE CONCAT('%', :searchTerm, '%') "
        + "ORDER BY r.occurrence DESC, r.name ASC")
    List<Race> findBySearchTermWithAgeGroups(@Param("searchTerm") String searchTerm);
}
