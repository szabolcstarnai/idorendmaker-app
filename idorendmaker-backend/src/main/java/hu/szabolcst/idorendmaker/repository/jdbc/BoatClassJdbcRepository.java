package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.BoatClass;
import hu.szabolcst.idorendmaker.repository.BoatClassRepository;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class BoatClassJdbcRepository
    extends BaseJdbcRepository<BoatClass, Integer>
    implements BoatClassRepository {

    public BoatClassJdbcRepository() {
        super(BoatClass.class);
    }

    protected String getTableName() {
        return "boat_classes";
    }

    protected String getIdColumnName() {
        return "id";
    }

    protected String getInsertSql() {
        return "INSERT INTO boat_classes (name, boat_type, seat_count, seat_count_text, created_at) VALUES (?, ?, ?, ?, ?)";
    }

    protected String getUpdateSql() {
        return "UPDATE boat_classes SET name = ?, boat_type = ?, seat_count = ?, seat_count_text = ? WHERE id = ?";
    }

    protected void setInsertParameters(final PreparedStatement ps, final BoatClass boatClass) throws Exception {
        ps.setString(1, boatClass.getName());
        ps.setString(2, boatClass.getBoatType());
        if (boatClass.getSeatCount() != null) {
            ps.setInt(3, boatClass.getSeatCount());
        } else {
            ps.setNull(3, java.sql.Types.INTEGER);
        }
        ps.setString(4, boatClass.getSeatCountText());
        ps.setTimestamp(5, Timestamp.valueOf(boatClass.getCreatedAt()));
    }

    protected void setUpdateParameters(final PreparedStatement ps, final BoatClass boatClass) throws Exception {
        ps.setString(1, boatClass.getName());
        ps.setString(2, boatClass.getBoatType());
        if (boatClass.getSeatCount() != null) {
            ps.setInt(3, boatClass.getSeatCount());
        } else {
            ps.setNull(3, java.sql.Types.INTEGER);
        }
        ps.setString(4, boatClass.getSeatCountText());
        ps.setInt(5, boatClass.getId());
    }

    protected Integer getId(final BoatClass boatClass) {
        return boatClass.getId();
    }

    protected void setId(final BoatClass boatClass, final Integer id) {
        boatClass.setId(id);
    }

    public List<BoatClass> findAllByOrderByNameAsc() {
        final String sql = "SELECT * FROM boat_classes ORDER BY name ASC";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper);
    }

    public List<String> findDistinctBoatTypes() {
        final String sql = "SELECT DISTINCT boat_type FROM boat_classes ORDER BY boat_type ASC";
        return this.jdbcTemplate.queryForList(sql, String.class);
    }

    public List<String> findDistinctSeatCountTexts() {
        final String sql = "SELECT DISTINCT seat_count_text FROM boat_classes ORDER BY CASE WHEN seat_count IS NULL THEN 9999 ELSE seat_count END ASC";
        return this.jdbcTemplate.queryForList(sql, String.class);
    }

    public BoatClass findByName(final String name) {
        final String sql = "SELECT * FROM boat_classes WHERE name = ?";
        try {
            return (BoatClass) this.jdbcTemplate.queryForObject(sql, (RowMapper) this.rowMapper, name);
        } catch (final Exception e) {
            return null;
        }
    }
}