package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.Level;
import hu.szabolcst.idorendmaker.repository.LevelRepository;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class LevelJdbcRepository
    extends BaseJdbcRepository<Level, Integer>
    implements LevelRepository {

    public LevelJdbcRepository() {
        super(Level.class);
    }

    protected String getTableName() {
        return "levels";
    }

    protected String getIdColumnName() {
        return "id";
    }

    protected String getInsertSql() {
        return "INSERT INTO levels (name, level_type, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, ?)";
    }

    protected String getUpdateSql() {
        return "UPDATE levels SET name = ?, level_type = ?, sort_order = ?, is_default = ? WHERE id = ?";
    }

    protected void setInsertParameters(final PreparedStatement ps, final Level level) throws Exception {
        ps.setString(1, level.getName());
        ps.setString(2, level.getLevelType());
        ps.setInt(3, level.getSortOrder());
        ps.setBoolean(4, level.getIsDefault());
        ps.setTimestamp(5, Timestamp.valueOf(level.getCreatedAt()));
    }

    protected void setUpdateParameters(final PreparedStatement ps, final Level level) throws Exception {
        ps.setString(1, level.getName());
        ps.setString(2, level.getLevelType());
        ps.setInt(3, level.getSortOrder());
        ps.setBoolean(4, level.getIsDefault());
        ps.setInt(5, level.getId());
    }

    protected Integer getId(final Level level) {
        return level.getId();
    }

    protected void setId(final Level level, final Integer id) {
        level.setId(id);
    }

    public List<Level> findAllByOrderBySortOrderAsc() {
        final String sql = "SELECT * FROM levels ORDER BY sort_order ASC";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper);
    }

    public Level findFirstByIsDefaultTrue() {
        try {
            final String sql = "SELECT * FROM levels WHERE is_default = ? LIMIT 1";
            return (Level) this.jdbcTemplate.queryForObject(sql, (RowMapper) this.rowMapper,
                new Object[]{
                    Boolean.TRUE});
        } catch (final Exception e) {
            return null;
        }
    }

    public List<Level> findAllByLevelTypeOrderBySortOrder(final String levelType) {
        final String sql = "SELECT * FROM levels WHERE level_type = ? ORDER BY sort_order ASC";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper,
            levelType);
    }

}