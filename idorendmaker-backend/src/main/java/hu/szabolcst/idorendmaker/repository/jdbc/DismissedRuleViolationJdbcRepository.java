package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.DismissedRuleViolation;
import hu.szabolcst.idorendmaker.repository.DismissedRuleViolationRepository;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class DismissedRuleViolationJdbcRepository
    extends BaseJdbcRepository<DismissedRuleViolation, Integer>
    implements DismissedRuleViolationRepository {

    public DismissedRuleViolationJdbcRepository() {
        super(DismissedRuleViolation.class);
    }

    protected String getTableName() {
        return "dismissed_rule_violations";
    }

    protected String getIdColumnName() {
        return "id";
    }

    protected String getInsertSql() {
        return "INSERT INTO dismissed_rule_violations (schedule_id, violation_hash, dismissed_at) VALUES (?, ?, ?)";
    }

    protected String getUpdateSql() {
        return "UPDATE dismissed_rule_violations SET schedule_id = ?, violation_hash = ?, dismissed_at = ? WHERE id = ?";
    }

    protected void setInsertParameters(final PreparedStatement ps, final DismissedRuleViolation violation) throws Exception {
        ps.setInt(1, violation.getScheduleId());
        ps.setString(2, violation.getViolationHash());
        ps.setTimestamp(3, Timestamp.valueOf(violation.getDismissedAt()));
    }

    protected void setUpdateParameters(final PreparedStatement ps, final DismissedRuleViolation violation) throws Exception {
        ps.setInt(1, violation.getScheduleId());
        ps.setString(2, violation.getViolationHash());
        ps.setTimestamp(3, Timestamp.valueOf(violation.getDismissedAt()));
        ps.setInt(4, violation.getId());
    }

    protected Integer getId(final DismissedRuleViolation violation) {
        return violation.getId();
    }

    protected void setId(final DismissedRuleViolation violation, final Integer id) {
        violation.setId(id);
    }

    public List<String> findViolationHashesByScheduleId(final Integer scheduleId) {
        final String sql = "SELECT violation_hash FROM dismissed_rule_violations WHERE schedule_id = ?";
        return this.jdbcTemplate.queryForList(sql, String.class,
            scheduleId);
    }

    public Optional<DismissedRuleViolation> findByScheduleIdAndViolationHash(final Integer scheduleId, final String violationHash) {
        try {
            final String sql = "SELECT * FROM dismissed_rule_violations WHERE schedule_id = ? AND violation_hash = ?";
            final DismissedRuleViolation violation = (DismissedRuleViolation) this.jdbcTemplate.queryForObject(
                sql, (RowMapper) this.rowMapper,
                new Object[]{scheduleId, violationHash});
            return Optional.ofNullable(violation);
        } catch (final Exception e) {
            return Optional.empty();
        }
    }

    public long countByScheduleId(final Integer scheduleId) {
        final String sql = "SELECT COUNT(*) FROM dismissed_rule_violations WHERE schedule_id = ?";
        return this.jdbcTemplate.queryForObject(sql, Long.class,
            scheduleId);
    }

    public int deleteByScheduleIdAndViolationHash(final Integer scheduleId, final String violationHash) {
        final String sql = "DELETE FROM dismissed_rule_violations WHERE schedule_id = ? AND violation_hash = ?";
        return this.jdbcTemplate.update(sql, scheduleId, violationHash);
    }

    public void deleteByScheduleId(final Integer scheduleId) {
        final String sql = "DELETE FROM dismissed_rule_violations WHERE schedule_id = ?";
        this.jdbcTemplate.update(sql, scheduleId);
    }

    public int deleteByScheduleIdAndViolationHashNotIn(final Integer scheduleId, final List<String> currentViolationHashes) {
        if (currentViolationHashes.isEmpty()) {

            final long countBeforeDelete = countByScheduleId(scheduleId);
            deleteByScheduleId(scheduleId);
            return (int) countBeforeDelete;
        }

        final StringBuilder sql = new StringBuilder("DELETE FROM dismissed_rule_violations WHERE schedule_id = ? AND violation_hash NOT IN (");
        for (int i = 0; i < currentViolationHashes.size(); i++) {
            if (i > 0) {
                sql.append(", ");
            }
            sql.append("?");
        }
        sql.append(")");

        final Object[] params = new Object[currentViolationHashes.size() + 1];
        params[0] = scheduleId;
        for (int j = 0; j < currentViolationHashes.size(); j++) {
            params[j + 1] = currentViolationHashes.get(j);
        }

        return this.jdbcTemplate.update(sql.toString(), params);
    }

}