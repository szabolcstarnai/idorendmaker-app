package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.DismissedRuleViolation;
import java.util.List;
import java.util.Optional;

public interface DismissedRuleViolationRepository {

    List<String> findViolationHashesByScheduleId(Integer paramInteger);

    Optional<DismissedRuleViolation> findByScheduleIdAndViolationHash(Integer paramInteger, String paramString);

    long countByScheduleId(Integer paramInteger);

    int deleteByScheduleIdAndViolationHash(Integer paramInteger, String paramString);

    void deleteByScheduleId(Integer paramInteger);

    int deleteByScheduleIdAndViolationHashNotIn(Integer paramInteger, List<String> paramList);
}