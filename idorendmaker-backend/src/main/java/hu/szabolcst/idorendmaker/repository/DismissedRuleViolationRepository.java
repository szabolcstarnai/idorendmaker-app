package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.DismissedRuleViolation;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DismissedRuleViolationRepository extends JpaRepository<DismissedRuleViolation, Integer> {

    @Query("SELECT d.violationHash FROM DismissedRuleViolation d WHERE d.scheduleId = :scheduleId")
    List<String> findViolationHashesByScheduleId(@Param("scheduleId") Integer scheduleId);

    Optional<DismissedRuleViolation> findByScheduleIdAndViolationHash(Integer scheduleId, String violationHash);

    long countByScheduleId(Integer scheduleId);

    @Modifying
    @Query("DELETE FROM DismissedRuleViolation d WHERE d.scheduleId = :scheduleId AND d.violationHash = :violationHash")
    int deleteByScheduleIdAndViolationHash(@Param("scheduleId") Integer scheduleId, @Param("violationHash") String violationHash);

    void deleteByScheduleId(Integer scheduleId);

    @Modifying
    @Query("DELETE FROM DismissedRuleViolation d WHERE d.scheduleId = :scheduleId AND d.violationHash NOT IN :hashes")
    int deleteByScheduleIdAndViolationHashExcluding(@Param("scheduleId") Integer scheduleId, @Param("hashes") List<String> hashes);

    default int deleteByScheduleIdAndViolationHashNotIn(final Integer scheduleId, final List<String> currentViolationHashes) {
        if (currentViolationHashes == null || currentViolationHashes.isEmpty()) {
            final long countBeforeDelete = countByScheduleId(scheduleId);
            deleteByScheduleId(scheduleId);
            return (int) countBeforeDelete;
        }
        return deleteByScheduleIdAndViolationHashExcluding(scheduleId, currentViolationHashes);
    }
    // save(entity) inherited
}
