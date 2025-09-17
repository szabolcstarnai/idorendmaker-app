package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import java.util.List;

public interface RuleMatchingRepository {

    List<RuleMatching> findByRuleIdOrderByFieldAsc(Integer paramInteger);

    void deleteByRuleId(Integer paramInteger);
}