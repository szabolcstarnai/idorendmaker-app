package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.AgeGroup;
import hu.szabolcst.idorendmaker.repository.AgeGroupRepository;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class AgeGroupJdbcRepository
    extends BaseJdbcRepository<AgeGroup, Integer>
    implements AgeGroupRepository {

    public AgeGroupJdbcRepository() {
        super(AgeGroup.class);
    }

    protected String getTableName() {
        return "age_groups";
    }

    protected String getIdColumnName() {
        return "id";
    }

    protected String getInsertSql() {
        return "INSERT INTO age_groups (name, created_at) VALUES (?, ?)";
    }

    protected String getUpdateSql() {
        return "UPDATE age_groups SET name = ? WHERE id = ?";
    }

    protected void setInsertParameters(final PreparedStatement ps, final AgeGroup ageGroup) throws Exception {
        ps.setString(1, ageGroup.getName());
        ps.setTimestamp(2, Timestamp.valueOf(ageGroup.getCreatedAt()));
    }

    protected void setUpdateParameters(final PreparedStatement ps, final AgeGroup ageGroup) throws Exception {
        ps.setString(1, ageGroup.getName());
        ps.setInt(2, ageGroup.getId());
    }

    protected Integer getId(final AgeGroup ageGroup) {
        return ageGroup.getId();
    }

    protected void setId(final AgeGroup ageGroup, final Integer id) {
        ageGroup.setId(id);
    }

    public List<AgeGroup> findAllByOrderByNameAsc() {
        final String sql = "SELECT * FROM age_groups ORDER BY name ASC";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper);
    }
}