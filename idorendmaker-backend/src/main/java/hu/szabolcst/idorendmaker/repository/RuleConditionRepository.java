package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
import java.util.List;

public interface RuleConditionRepository {

    List<RuleCondition> findByRuleIdOrderByConditionSetAsc(Integer paramInteger);

    void deleteByRuleId(Integer paramInteger);

    List<RuleCondition> saveAll(Iterable<RuleCondition> entities);
}