package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.RaceAgeGroup;
import hu.szabolcst.idorendmaker.repository.RaceRepository;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Repository;


@Repository
public class RaceJdbcRepository
    extends BaseJdbcRepository<Race, Integer>
    implements RaceRepository {

    @Autowired
    private RaceAgeGroupJdbcRepository raceAgeGroupRepository;

    public RaceJdbcRepository() {
        super(Race.class);
    }


    protected String getTableName() {
        return "races";
    }


    protected String getIdColumnName() {
        return "id";
    }


    protected String getInsertSql() {
        return "INSERT INTO races (name, discipline, boat_class, gender, distance, occurrence, hidden, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    }


    protected String getUpdateSql() {
        return "UPDATE races SET name = ?, discipline = ?, boat_class = ?, gender = ?, distance = ?, occurrence = ?, hidden = ?, updated_at = ? WHERE id = ?";
    }


    protected void setInsertParameters(final PreparedStatement ps, final Race race) throws Exception {
        ps.setString(1, race.getName());
        ps.setString(2, race.getDiscipline());
        ps.setString(3, race.getBoatClass());
        ps.setString(4, race.getGender());
        ps.setString(5, race.getDistance());
        ps.setInt(6, race.getOccurrence());
        ps.setBoolean(7, race.getHidden());
        ps.setTimestamp(8, Timestamp.valueOf(race.getCreatedAt()));
        ps.setTimestamp(9, Timestamp.valueOf(race.getUpdatedAt()));
    }


    protected void setUpdateParameters(final PreparedStatement ps, final Race race) throws Exception {
        ps.setString(1, race.getName());
        ps.setString(2, race.getDiscipline());
        ps.setString(3, race.getBoatClass());
        ps.setString(4, race.getGender());
        ps.setString(5, race.getDistance());
        ps.setInt(6, race.getOccurrence());
        ps.setBoolean(7, race.getHidden());
        ps.setTimestamp(8, Timestamp.valueOf(race.getUpdatedAt()));
        ps.setInt(9, race.getId());
    }


    protected Integer getId(final Race race) {
        return race.getId();
    }


    protected void setId(final Race race, final Integer id) {
        race.setId(id);
    }


    public List<Race> findAllWithAgeGroupsOrdered() {
        final String sql = "SELECT DISTINCT r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at FROM races r LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id ORDER BY r.occurrence DESC, r.name ASC";

        return (List<Race>) this.jdbcTemplate.query(
            "SELECT DISTINCT r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at FROM races r LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id ORDER BY r.occurrence DESC, r.name ASC",
            (ResultSetExtractor) new RaceWithAgeGroupsExtractor());
    }


    public List<Race> findBySearchTermWithAgeGroups(final String searchTerm) {
        final String sql = "SELECT DISTINCT r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at FROM races r LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id WHERE r.name LIKE ? OR r.discipline LIKE ? OR r.boat_class LIKE ? OR r.gender LIKE ? OR r.distance LIKE ? OR ag.name LIKE ? ORDER BY r.occurrence DESC, r.name ASC";

        final String likePattern = "%" + searchTerm + "%";
        return (List<Race>) this.jdbcTemplate.query(
            "SELECT DISTINCT r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at FROM races r LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id WHERE r.name LIKE ? OR r.discipline LIKE ? OR r.boat_class LIKE ? OR r.gender LIKE ? OR r.distance LIKE ? OR ag.name LIKE ? ORDER BY r.occurrence DESC, r.name ASC",
            (ResultSetExtractor) new RaceWithAgeGroupsExtractor(),
            new Object[]{likePattern, likePattern, likePattern, likePattern, likePattern, likePattern});
    }


    public void deleteById(final Integer id) {
        this.raceAgeGroupRepository.deleteAllByRaceId(id);

        super.deleteById(id);
    }

    class RaceWithAgeGroupsExtractor
        implements ResultSetExtractor<List<Race>> {

        public List<Race> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, Race> raceMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer raceId = rs.getInt("r_id");

                Race race = raceMap.get(raceId);
                if (race == null) {
                    race = new Race();
                    race.setId(raceId);
                    race.setName(rs.getString("r_name"));
                    race.setDiscipline(rs.getString("r_discipline"));
                    race.setBoatClass(rs.getString("r_boat_class"));
                    race.setGender(rs.getString("r_gender"));
                    race.setDistance(rs.getString("r_distance"));
                    race.setOccurrence(rs.getInt("r_occurrence"));
                    race.setHidden(rs.getBoolean("r_hidden"));
                    final Timestamp createdAt = rs.getTimestamp("r_created_at");
                    if (createdAt != null) {
                        race.setCreatedAt(createdAt.toLocalDateTime());
                    }
                    final Timestamp updatedAt = rs.getTimestamp("r_updated_at");
                    if (updatedAt != null) {
                        race.setUpdatedAt(updatedAt.toLocalDateTime());
                    }
                    race.setAgeGroups(new ArrayList());

                    raceMap.put(raceId, race);
                }

                final Integer ageGroupId = (Integer) rs.getObject("ag_id");
                if (ageGroupId != null) {

                    final boolean alreadyExists = race.getAgeGroups().stream().anyMatch(rag -> rag.getAgeGroupId().equals(ageGroupId));

                    if (!alreadyExists) {
                        final AgeGroup ageGroup = new AgeGroup();
                        ageGroup.setId(ageGroupId);
                        ageGroup.setName(rs.getString("ag_name"));
                        final Timestamp agCreatedAt = rs.getTimestamp("ag_created_at");
                        if (agCreatedAt != null) {
                            ageGroup.setCreatedAt(agCreatedAt.toLocalDateTime());
                        }

                        final RaceAgeGroup raceAgeGroup = new RaceAgeGroup();
                        raceAgeGroup.setRaceId(raceId);
                        raceAgeGroup.setAgeGroupId(ageGroupId);
                        raceAgeGroup.setRace(race);
                        raceAgeGroup.setAgeGroup(ageGroup);

                        race.getAgeGroups().add(raceAgeGroup);
                    }
                }
            }

            return new ArrayList<>(raceMap.values());
        }
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\RaceJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */