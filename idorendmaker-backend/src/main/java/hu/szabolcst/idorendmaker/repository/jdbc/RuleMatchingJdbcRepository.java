package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import hu.szabolcst.idorendmaker.repository.RuleMatchingRepository;
import java.sql.PreparedStatement;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class RuleMatchingJdbcRepository
    extends BaseJdbcRepository<RuleMatching, Integer>
    implements RuleMatchingRepository {

    public RuleMatchingJdbcRepository() {
        super(RuleMatching.class);
    }


    protected String getTableName() {
        return "rule_matchings";
    }


    protected String getIdColumnName() {
        return "id";
    }


    protected String getInsertSql() {
        return "INSERT INTO rule_matchings (rule_id, field) VALUES (?, ?)";
    }


    protected String getUpdateSql() {
        return "UPDATE rule_matchings SET rule_id = ?, field = ? WHERE id = ?";
    }


    protected void setInsertParameters(final PreparedStatement ps, final RuleMatching matching) throws Exception {
        ps.setInt(1, matching.getRuleId());
        ps.setString(2, matching.getField());
    }


    protected void setUpdateParameters(final PreparedStatement ps, final RuleMatching matching) throws Exception {
        ps.setInt(1, matching.getRuleId());
        ps.setString(2, matching.getField());
        ps.setInt(3, matching.getId());
    }


    protected Integer getId(final RuleMatching matching) {
        return matching.getId();
    }


    protected void setId(final RuleMatching matching, final Integer id) {
        matching.setId(id);
    }


    public List<RuleMatching> findByRuleIdOrderByFieldAsc(final Integer ruleId) {
        final String sql = "SELECT * FROM rule_matchings WHERE rule_id = ? ORDER BY field ASC";
        return this.jdbcTemplate.query("SELECT * FROM rule_matchings WHERE rule_id = ? ORDER BY field ASC", (RowMapper) this.rowMapper,
            ruleId);
    }


    public void deleteByRuleId(final Integer ruleId) {
        final String sql = "DELETE FROM rule_matchings WHERE rule_id = ?";
        this.jdbcTemplate.update("DELETE FROM rule_matchings WHERE rule_id = ?", ruleId);
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\RuleMatchingJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */