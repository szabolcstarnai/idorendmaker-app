package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.Rule;
import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import hu.szabolcst.idorendmaker.repository.RuleRepository;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;


@Repository
public class RuleJdbcRepository
    extends BaseJdbcRepository<Rule, Integer>
    implements RuleRepository {

    @Autowired
    private RuleConditionJdbcRepository ruleConditionRepository;
    @Autowired
    private RuleMatchingJdbcRepository ruleMatchingRepository;

    public RuleJdbcRepository() {
        super(Rule.class);
    }


    protected String getTableName() {
        return "rules";
    }


    protected String getIdColumnName() {
        return "id";
    }


    protected String getInsertSql() {
        return "INSERT INTO rules (name, description, min_interval_minutes, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)";
    }


    protected String getUpdateSql() {
        return "UPDATE rules SET name = ?, description = ?, min_interval_minutes = ?, is_active = ?, updated_at = ? WHERE id = ?";
    }


    protected void setInsertParameters(final PreparedStatement ps, final Rule rule) throws Exception {
        ps.setString(1, rule.getName());
        ps.setString(2, rule.getDescription());
        ps.setObject(3, rule.getMinIntervalMinutes());
        ps.setBoolean(4, rule.getIsActive());
        ps.setTimestamp(5, Timestamp.valueOf(rule.getCreatedAt()));
        ps.setTimestamp(6, Timestamp.valueOf(rule.getUpdatedAt()));
    }


    protected void setUpdateParameters(final PreparedStatement ps, final Rule rule) throws Exception {
        ps.setString(1, rule.getName());
        ps.setString(2, rule.getDescription());
        ps.setObject(3, rule.getMinIntervalMinutes());
        ps.setBoolean(4, rule.getIsActive());
        ps.setTimestamp(5, Timestamp.valueOf(rule.getUpdatedAt()));
        ps.setInt(6, rule.getId());
    }


    protected Integer getId(final Rule rule) {
        return rule.getId();
    }


    protected void setId(final Rule rule, final Integer id) {
        rule.setId(id);
    }


    public List<Rule> findAllRules() {
        final String sql = "SELECT * FROM rules ORDER BY is_active DESC, created_at DESC";
        return this.jdbcTemplate.query("SELECT * FROM rules ORDER BY is_active DESC, created_at DESC", (RowMapper) this.rowMapper);
    }


    public List<Rule> findAllWithConditions() {
        final String sql = "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC\n";

        return (List<Rule>) this.jdbcTemplate.query(
            "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC\n",
            (ResultSetExtractor) new RuleWithConditionsExtractor());
    }


    public List<Rule> findWithMatchingsByIds(final List<Integer> ruleIds) {
        if (ruleIds.isEmpty()) {
            return List.of();
        }

        final StringBuilder sql = new StringBuilder(
            "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field\n    FROM rules r\n    LEFT JOIN rule_matchings rm ON r.id = rm.rule_id\n    WHERE r.id IN (\n");

        for (int i = 0; i < ruleIds.size(); i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("?");
        }
        sql.append(") ORDER BY r.is_active DESC, r.created_at DESC, rm.field ASC");

        return (List<Rule>) this.jdbcTemplate.query(sql.toString(), (ResultSetExtractor) new RuleWithMatchingsExtractor(),
            ruleIds.toArray());
    }


    public List<Rule> findActiveWithConditions() {
        final String sql = "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    WHERE r.is_active = true\n    ORDER BY r.created_at DESC, rc.condition_set ASC\n";

        return (List<Rule>) this.jdbcTemplate.query(
            "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    WHERE r.is_active = true\n    ORDER BY r.created_at DESC, rc.condition_set ASC\n",
            (ResultSetExtractor) new RuleWithConditionsExtractor());
    }


    public Optional<Rule> findByIdWithConditions(final Integer id) {
        final String sql = "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    WHERE r.id = ?\n    ORDER BY rc.condition_set ASC\n";

        final List<Rule> rules = (List<Rule>) this.jdbcTemplate.query(
            "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    WHERE r.id = ?\n    ORDER BY rc.condition_set ASC\n",
            (ResultSetExtractor) new RuleWithConditionsExtractor(), new Object[]{id});
        return rules.isEmpty() ? Optional.empty() : Optional.of(rules.get(0));
    }


    public Optional<Rule> findByIdWithMatchings(final Integer id) {
        final String sql = "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field\n    FROM rules r\n    LEFT JOIN rule_matchings rm ON r.id = rm.rule_id\n    WHERE r.id = ?\n    ORDER BY rm.field ASC\n";

        final List<Rule> rules = (List<Rule>) this.jdbcTemplate.query(
            "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field\n    FROM rules r\n    LEFT JOIN rule_matchings rm ON r.id = rm.rule_id\n    WHERE r.id = ?\n    ORDER BY rm.field ASC\n",
            (ResultSetExtractor) new RuleWithMatchingsExtractor(), new Object[]{id});
        return rules.isEmpty() ? Optional.empty() : Optional.of(rules.get(0));
    }


    public long countByIsActiveTrue() {
        final String sql = "SELECT COUNT(*) FROM rules WHERE is_active = true";
        final Long count = this.jdbcTemplate.queryForObject("SELECT COUNT(*) FROM rules WHERE is_active = true", Long.class);
        return (count != null) ? count : 0L;
    }


    public List<Rule> searchWithConditions(final String searchTerm) {
        final String sql = "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    WHERE r.name LIKE ? OR r.description LIKE ?\n    ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC\n";

        final String likePattern = "%" + searchTerm + "%";
        return (List<Rule>) this.jdbcTemplate.query(
            "    SELECT\n        r.id as r_id, r.name as r_name, r.description as r_description,\n        r.min_interval_minutes as r_min_interval, r.is_active as r_is_active,\n        r.created_at as r_created_at, r.updated_at as r_updated_at,\n        rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set,\n        rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value\n    FROM rules r\n    LEFT JOIN rule_conditions rc ON r.id = rc.rule_id\n    WHERE r.name LIKE ? OR r.description LIKE ?\n    ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC\n",
            (ResultSetExtractor) new RuleWithConditionsExtractor(), new Object[]{likePattern, likePattern});
    }


    public List<Rule> findAllWithConditionsAndMatchings() {
        final String sql = "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC, rm.field ASC";

        return (List<Rule>) this.jdbcTemplate.query(
            "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC, rm.field ASC",
            (ResultSetExtractor) new RuleWithConditionsAndMatchingsExtractor());
    }


    public List<Rule> findActiveWithConditionsAndMatchings() {
        final String sql = "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id WHERE r.is_active = true ORDER BY r.created_at DESC, rc.condition_set ASC, rm.field ASC";

        return (List<Rule>) this.jdbcTemplate.query(
            "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id WHERE r.is_active = true ORDER BY r.created_at DESC, rc.condition_set ASC, rm.field ASC",
            (ResultSetExtractor) new RuleWithConditionsAndMatchingsExtractor());
    }


    public Optional<Rule> findByIdWithConditionsAndMatchings(final Integer id) {
        final String sql = "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id WHERE r.id = ? ORDER BY rc.condition_set ASC, rm.field ASC";

        final List<Rule> rules = (List<Rule>) this.jdbcTemplate.query(
            "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id WHERE r.id = ? ORDER BY rc.condition_set ASC, rm.field ASC",
            (ResultSetExtractor) new RuleWithConditionsAndMatchingsExtractor(), new Object[]{id});
        return rules.isEmpty() ? Optional.empty() : Optional.of(rules.get(0));
    }


    public List<Rule> searchWithConditionsAndMatchings(final String searchTerm) {
        final String sql = "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id WHERE r.name LIKE ? OR r.description LIKE ? ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC, rm.field ASC";

        final String likePattern = "%" + searchTerm + "%";
        return (List<Rule>) this.jdbcTemplate.query(
            "SELECT r.id as r_id, r.name as r_name, r.description as r_description, r.min_interval_minutes as r_min_interval, r.is_active as r_is_active, r.created_at as r_created_at, r.updated_at as r_updated_at, rc.id as rc_id, rc.rule_id as rc_rule_id, rc.condition_set as rc_condition_set, rc.field as rc_field, rc.operator as rc_operator, rc.value as rc_value, rm.id as rm_id, rm.rule_id as rm_rule_id, rm.field as rm_field FROM rules r LEFT JOIN rule_conditions rc ON r.id = rc.rule_id LEFT JOIN rule_matchings rm ON r.id = rm.rule_id WHERE r.name LIKE ? OR r.description LIKE ? ORDER BY r.is_active DESC, r.created_at DESC, rc.condition_set ASC, rm.field ASC",
            (ResultSetExtractor) new RuleWithConditionsAndMatchingsExtractor(), new Object[]{likePattern, likePattern});
    }


    public void deleteById(final Integer id) {
        this.ruleConditionRepository.deleteByRuleId(id);

        this.ruleMatchingRepository.deleteByRuleId(id);

        super.deleteById(id);
    }

    class RuleWithConditionsAndMatchingsExtractor
        implements ResultSetExtractor<List<Rule>> {

        public List<Rule> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, Rule> ruleMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer ruleId = rs.getInt("r_id");

                Rule rule = ruleMap.get(ruleId);
                if (rule == null) {
                    rule = new Rule();
                    rule.setId(ruleId);
                    rule.setName(rs.getString("r_name"));
                    rule.setDescription(rs.getString("r_description"));
                    rule.setMinIntervalMinutes((Integer) rs.getObject("r_min_interval"));
                    rule.setIsActive(rs.getBoolean("r_is_active"));
                    final Timestamp createdAt = rs.getTimestamp("r_created_at");
                    if (createdAt != null) {
                        rule.setCreatedAt(createdAt.toLocalDateTime());
                    }
                    final Timestamp updatedAt = rs.getTimestamp("r_updated_at");
                    if (updatedAt != null) {
                        rule.setUpdatedAt(updatedAt.toLocalDateTime());
                    }
                    rule.setConditions(new ArrayList());
                    rule.setMatchings(new ArrayList());

                    ruleMap.put(ruleId, rule);
                }

                final Integer conditionId = (Integer) rs.getObject("rc_id");
                if (conditionId != null) {

                    final boolean conditionExists = rule.getConditions().stream().anyMatch(rc -> rc.getId().equals(conditionId));

                    if (!conditionExists) {
                        final RuleCondition condition = new RuleCondition();
                        condition.setId(conditionId);
                        condition.setRuleId(rs.getInt("rc_rule_id"));
                        condition.setConditionSet(rs.getString("rc_condition_set"));
                        condition.setField(rs.getString("rc_field"));
                        condition.setOperator(rs.getString("rc_operator"));
                        condition.setValue(rs.getString("rc_value"));

                        rule.getConditions().add(condition);
                    }
                }

                final Integer matchingId = (Integer) rs.getObject("rm_id");
                if (matchingId != null) {

                    final boolean matchingExists = rule.getMatchings().stream().anyMatch(rm -> rm.getId().equals(matchingId));

                    if (!matchingExists) {
                        final RuleMatching matching = new RuleMatching();
                        matching.setId(matchingId);
                        matching.setRuleId(rs.getInt("rm_rule_id"));
                        matching.setField(rs.getString("rm_field"));

                        rule.getMatchings().add(matching);
                    }
                }
            }

            return new ArrayList<>(ruleMap.values());
        }
    }

    class RuleWithConditionsExtractor
        implements ResultSetExtractor<List<Rule>> {

        public List<Rule> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, Rule> ruleMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer ruleId = rs.getInt("r_id");

                Rule rule = ruleMap.get(ruleId);
                if (rule == null) {
                    rule = new Rule();
                    rule.setId(ruleId);
                    rule.setName(rs.getString("r_name"));
                    rule.setDescription(rs.getString("r_description"));
                    rule.setMinIntervalMinutes((Integer) rs.getObject("r_min_interval"));
                    rule.setIsActive(rs.getBoolean("r_is_active"));
                    final Timestamp createdAt = rs.getTimestamp("r_created_at");
                    if (createdAt != null) {
                        rule.setCreatedAt(createdAt.toLocalDateTime());
                    }
                    final Timestamp updatedAt = rs.getTimestamp("r_updated_at");
                    if (updatedAt != null) {
                        rule.setUpdatedAt(updatedAt.toLocalDateTime());
                    }
                    rule.setConditions(new ArrayList());
                    rule.setMatchings(new ArrayList());

                    ruleMap.put(ruleId, rule);
                }

                final Integer conditionId = (Integer) rs.getObject("rc_id");
                if (conditionId != null) {

                    final boolean conditionExists = rule.getConditions().stream().anyMatch(rc -> rc.getId().equals(conditionId));

                    if (!conditionExists) {
                        final RuleCondition condition = new RuleCondition();
                        condition.setId(conditionId);
                        condition.setRuleId(rs.getInt("rc_rule_id"));
                        condition.setConditionSet(rs.getString("rc_condition_set"));
                        condition.setField(rs.getString("rc_field"));
                        condition.setOperator(rs.getString("rc_operator"));
                        condition.setValue(rs.getString("rc_value"));

                        rule.getConditions().add(condition);
                    }
                }
            }

            return new ArrayList<>(ruleMap.values());
        }
    }

    class RuleWithMatchingsExtractor
        implements ResultSetExtractor<List<Rule>> {

        public List<Rule> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, Rule> ruleMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer ruleId = rs.getInt("r_id");

                Rule rule = ruleMap.get(ruleId);
                if (rule == null) {
                    rule = new Rule();
                    rule.setId(ruleId);
                    rule.setName(rs.getString("r_name"));
                    rule.setDescription(rs.getString("r_description"));
                    rule.setMinIntervalMinutes((Integer) rs.getObject("r_min_interval"));
                    rule.setIsActive(rs.getBoolean("r_is_active"));
                    final Timestamp createdAt = rs.getTimestamp("r_created_at");
                    if (createdAt != null) {
                        rule.setCreatedAt(createdAt.toLocalDateTime());
                    }
                    final Timestamp updatedAt = rs.getTimestamp("r_updated_at");
                    if (updatedAt != null) {
                        rule.setUpdatedAt(updatedAt.toLocalDateTime());
                    }
                    rule.setConditions(new ArrayList());
                    rule.setMatchings(new ArrayList());

                    ruleMap.put(ruleId, rule);
                }

                final Integer matchingId = (Integer) rs.getObject("rm_id");
                if (matchingId != null) {

                    final boolean matchingExists = rule.getMatchings().stream().anyMatch(rm -> rm.getId().equals(matchingId));

                    if (!matchingExists) {
                        final RuleMatching matching = new RuleMatching();
                        matching.setId(matchingId);
                        matching.setRuleId(rs.getInt("rm_rule_id"));
                        matching.setField(rs.getString("rm_field"));

                        rule.getMatchings().add(matching);
                    }
                }
            }

            return new ArrayList<>(ruleMap.values());
        }
    }

}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\RuleJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */