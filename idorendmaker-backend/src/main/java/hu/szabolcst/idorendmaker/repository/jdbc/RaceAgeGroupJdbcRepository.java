package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.RaceAgeGroup;
import java.sql.PreparedStatement;
import java.util.List;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class RaceAgeGroupJdbcRepository
    extends BaseJdbcRepository<RaceAgeGroup, Integer> {

    public RaceAgeGroupJdbcRepository() {
        super(RaceAgeGroup.class);
    }

    protected String getTableName() {
        return "race_age_groups";
    }

    protected String getIdColumnName() {
        return "race_id";
    }

    protected String getInsertSql() {
        return "INSERT INTO race_age_groups (race_id, age_group_id) VALUES (?, ?)";
    }

    protected String getUpdateSql() {
        throw new UnsupportedOperationException("Updates not supported for join table RaceAgeGroup");
    }

    protected void setInsertParameters(final PreparedStatement ps, final RaceAgeGroup raceAgeGroup) throws Exception {
        ps.setInt(1, raceAgeGroup.getRaceId());
        ps.setInt(2, raceAgeGroup.getAgeGroupId());
    }

    protected void setUpdateParameters(final PreparedStatement ps, final RaceAgeGroup raceAgeGroup) {
        throw new UnsupportedOperationException("Updates not supported for join table RaceAgeGroup");
    }

    protected Integer getId(final RaceAgeGroup raceAgeGroup) {
        return raceAgeGroup.getRaceId();
    }

    protected void setId(final RaceAgeGroup raceAgeGroup, final Integer id) {
        raceAgeGroup.setRaceId(id);
    }

    public List<RaceAgeGroup> findAllByRaceId(final Integer raceId) {
        final String sql = "SELECT * FROM race_age_groups WHERE race_id = ?";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper, raceId);
    }


    public List<RaceAgeGroup> findAllByAgeGroupId(final Integer ageGroupId) {
        final String sql = "SELECT * FROM race_age_groups WHERE age_group_id = ?";
        return this.jdbcTemplate.query("SELECT * FROM race_age_groups WHERE age_group_id = ?", (RowMapper) this.rowMapper, ageGroupId);
    }


    public void deleteAllByRaceId(final Integer raceId) {
        final String sql = "DELETE FROM race_age_groups WHERE race_id = ?";
        this.jdbcTemplate.update("DELETE FROM race_age_groups WHERE race_id = ?", raceId);
    }


    public void deleteAllByAgeGroupId(final Integer ageGroupId) {
        final String sql = "DELETE FROM race_age_groups WHERE age_group_id = ?";
        this.jdbcTemplate.update("DELETE FROM race_age_groups WHERE age_group_id = ?", ageGroupId);
    }


    public boolean existsByRaceIdAndAgeGroupId(final Integer raceId, final Integer ageGroupId) {
        final String sql = "SELECT COUNT(*) FROM race_age_groups WHERE race_id = ? AND age_group_id = ?";
        final Integer count = this.jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM race_age_groups WHERE race_id = ? AND age_group_id = ?", Integer.class, new Object[]{raceId, ageGroupId});
        return (count > 0);
    }
}