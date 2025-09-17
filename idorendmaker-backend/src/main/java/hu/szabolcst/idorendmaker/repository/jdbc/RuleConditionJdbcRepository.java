 package hu.szabolcst.idorendmaker.repository.jdbc;
 
 import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
 import hu.szabolcst.idorendmaker.repository.RuleConditionRepository;
 import hu.szabolcst.idorendmaker.repository.jdbc.BaseJdbcRepository;
 import java.sql.PreparedStatement;
 import java.util.List;
 import org.springframework.jdbc.core.RowMapper;
 import org.springframework.stereotype.Repository;
 
 @Repository
 public class RuleConditionJdbcRepository
   extends BaseJdbcRepository<RuleCondition, Integer>
   implements RuleConditionRepository
 {
   public RuleConditionJdbcRepository() {
     super(RuleCondition.class);
   }
 
   
   protected String getTableName() {
     return "rule_conditions";
   }
 
   
   protected String getIdColumnName() {
     return "id";
   }
 
   
   protected String getInsertSql() {
     return "INSERT INTO rule_conditions (rule_id, condition_set, field, operator, value) VALUES (?, ?, ?, ?, ?)";
   }
 
   
   protected String getUpdateSql() {
     return "UPDATE rule_conditions SET rule_id = ?, condition_set = ?, field = ?, operator = ?, value = ? WHERE id = ?";
   }
 
   
   protected void setInsertParameters(final PreparedStatement ps, final RuleCondition condition) throws Exception {
     ps.setInt(1, condition.getRuleId());
     ps.setString(2, condition.getConditionSet());
     ps.setString(3, condition.getField());
     ps.setString(4, condition.getOperator());
     ps.setString(5, condition.getValue());
   }
 
   
   protected void setUpdateParameters(final PreparedStatement ps, final RuleCondition condition) throws Exception {
     ps.setInt(1, condition.getRuleId());
     ps.setString(2, condition.getConditionSet());
     ps.setString(3, condition.getField());
     ps.setString(4, condition.getOperator());
     ps.setString(5, condition.getValue());
     ps.setInt(6, condition.getId());
   }
 
   
   protected Integer getId(final RuleCondition condition) {
     return condition.getId();
   }
 
   
   protected void setId(final RuleCondition condition, final Integer id) {
     condition.setId(id);
   }
 
 
 
 
 
 
   
   public List<RuleCondition> findByRuleIdOrderByConditionSetAsc(final Integer ruleId) {
     final String sql = "SELECT * FROM rule_conditions WHERE rule_id = ? ORDER BY condition_set ASC";
     return this.jdbcTemplate.query("SELECT * FROM rule_conditions WHERE rule_id = ? ORDER BY condition_set ASC", (RowMapper)this.rowMapper,
         ruleId);
   }
 
 
 
 
   
   public void deleteByRuleId(final Integer ruleId) {
     final String sql = "DELETE FROM rule_conditions WHERE rule_id = ?";
     this.jdbcTemplate.update("DELETE FROM rule_conditions WHERE rule_id = ?", ruleId);
   }
 }


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\RuleConditionJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */