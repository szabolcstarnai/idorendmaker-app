package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RuleConditionRepository extends JpaRepository<RuleCondition, Integer> {

    List<RuleCondition> findByRuleIdOrderByConditionSetAsc(Integer ruleId);

    void deleteByRuleId(Integer ruleId);
    // saveAll(Iterable<RuleCondition>) inherited
}
