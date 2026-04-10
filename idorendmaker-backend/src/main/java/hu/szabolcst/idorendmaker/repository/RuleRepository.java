package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.Rule;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RuleRepository extends JpaRepository<Rule, Integer> {

    @Query("SELECT r FROM Rule r ORDER BY r.isActive DESC, r.createdAt DESC")
    List<Rule> findAllRules();

    @Query("SELECT DISTINCT r FROM Rule r LEFT JOIN FETCH r.conditions "
        + "ORDER BY r.isActive DESC, r.createdAt DESC")
    List<Rule> findAllWithConditions();

    @Query("SELECT DISTINCT r FROM Rule r LEFT JOIN FETCH r.matchings WHERE r.id IN :ids "
        + "ORDER BY r.isActive DESC, r.createdAt DESC")
    List<Rule> findWithMatchingsByIds(@Param("ids") List<Integer> ids);

    @Query("SELECT DISTINCT r FROM Rule r LEFT JOIN FETCH r.conditions "
        + "WHERE r.isActive = true ORDER BY r.createdAt DESC")
    List<Rule> findActiveWithConditions();

    @Query("SELECT DISTINCT r FROM Rule r LEFT JOIN FETCH r.conditions WHERE r.id = :id")
    Optional<Rule> findByIdWithConditions(@Param("id") Integer id);

    @Query("SELECT DISTINCT r FROM Rule r LEFT JOIN FETCH r.matchings WHERE r.id = :id")
    Optional<Rule> findByIdWithMatchings(@Param("id") Integer id);

    long countByIsActiveTrue();

    @Query("SELECT DISTINCT r FROM Rule r LEFT JOIN FETCH r.conditions "
        + "WHERE r.name LIKE CONCAT('%', :searchTerm, '%') "
        + "OR r.description LIKE CONCAT('%', :searchTerm, '%') "
        + "ORDER BY r.isActive DESC, r.createdAt DESC")
    List<Rule> searchWithConditions(@Param("searchTerm") String searchTerm);

    default List<Rule> findAllWithConditionsAndMatchings() {
        final List<Rule> rules = findAllWithConditions();
        if (!rules.isEmpty()) {
            findWithMatchingsByIds(rules.stream().map(Rule::getId).toList());
        }
        return rules;
    }

    default List<Rule> findActiveWithConditionsAndMatchings() {
        final List<Rule> rules = findActiveWithConditions();
        if (!rules.isEmpty()) {
            findWithMatchingsByIds(rules.stream().map(Rule::getId).toList());
        }
        return rules;
    }

    default Optional<Rule> findByIdWithConditionsAndMatchings(final Integer id) {
        final Optional<Rule> rule = findByIdWithConditions(id);
        rule.ifPresent(r -> findByIdWithMatchings(r.getId()));
        return rule;
    }

    default List<Rule> searchWithConditionsAndMatchings(final String searchTerm) {
        final List<Rule> rules = searchWithConditions(searchTerm);
        if (!rules.isEmpty()) {
            findWithMatchingsByIds(rules.stream().map(Rule::getId).toList());
        }
        return rules;
    }
}
