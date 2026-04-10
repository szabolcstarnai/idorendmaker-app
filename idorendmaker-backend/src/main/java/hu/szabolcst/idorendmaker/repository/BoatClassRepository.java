package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.BoatClass;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BoatClassRepository extends JpaRepository<BoatClass, Integer> {

    List<BoatClass> findAllByOrderByNameAsc();

    @Query("SELECT DISTINCT b.boatType FROM BoatClass b WHERE b.boatType IS NOT NULL ORDER BY b.boatType")
    List<String> findDistinctBoatTypes();

    @Query("SELECT DISTINCT b.seatCountText FROM BoatClass b WHERE b.seatCountText IS NOT NULL ORDER BY b.seatCountText")
    List<String> findDistinctSeatCountTexts();

    BoatClass findByName(String name);
    // findById(Integer) and count() inherited from JpaRepository
}
