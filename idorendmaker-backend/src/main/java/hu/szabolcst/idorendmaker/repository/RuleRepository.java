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

    List<Rule> findAllWithConditionsAndMatchings();

    List<Rule> findActiveWithConditionsAndMatchings();

    Optional<Rule> findByIdWithConditionsAndMatchings(Integer id);

    List<Rule> searchWithConditionsAndMatchings(String searchTerm);

    List<Rule> saveAll(Iterable<Rule> entities);

    Rule save(Rule entity);

    Optional<Rule> findById(Integer id);

    void deleteById(Integer id);

    long count();
}