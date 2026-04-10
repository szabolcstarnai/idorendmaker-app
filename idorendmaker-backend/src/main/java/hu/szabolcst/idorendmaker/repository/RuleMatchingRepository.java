package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RuleMatchingRepository extends JpaRepository<RuleMatching, Integer> {

    List<RuleMatching> findByRuleIdOrderByFieldAsc(Integer ruleId);

    void deleteByRuleId(Integer ruleId);
    // saveAll(Iterable<RuleMatching>) inherited from JpaRepository
}
