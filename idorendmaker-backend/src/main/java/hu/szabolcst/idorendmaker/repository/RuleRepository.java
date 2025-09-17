package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Rule;
import java.util.List;
import java.util.Optional;

public interface RuleRepository {

    List<Rule> findAllRules();

    List<Rule> findAllWithConditions();

    List<Rule> findWithMatchingsByIds(List<Integer> paramList);

    List<Rule> findActiveWithConditions();

    Optional<Rule> findByIdWithConditions(Integer paramInteger);

    Optional<Rule> findByIdWithMatchings(Integer paramInteger);

    long countByIsActiveTrue();

    List<Rule> searchWithConditions(String paramString);
}