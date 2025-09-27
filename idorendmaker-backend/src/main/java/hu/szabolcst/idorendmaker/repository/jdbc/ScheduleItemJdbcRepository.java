package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.BoatClass;
import hu.szabolcst.idorendmaker.model.entity.Level;
import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.RaceAgeGroup;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import hu.szabolcst.idorendmaker.repository.ScheduleItemRepository;
import hu.szabolcst.idorendmaker.utils.JdbcUtils;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.stereotype.Repository;


@Repository
public class ScheduleItemJdbcRepository
    extends BaseJdbcRepository<ScheduleItem, Integer>
    implements ScheduleItemRepository {

    public ScheduleItemJdbcRepository() {
        super(ScheduleItem.class);
    }


    protected String getTableName() {
        return "schedule_items";
    }


    protected String getIdColumnName() {
        return "id";
    }


    protected String getInsertSql() {
        return "INSERT INTO schedule_items (schedule_id, section_id, race_id, level_id, order_index, interval_minutes, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    }


    protected String getUpdateSql() {
        return "UPDATE schedule_items SET schedule_id = ?, section_id = ?, race_id = ?, level_id = ?, order_index = ?, interval_minutes = ?, notes = ?, created_at = ? WHERE id = ?";
    }


    protected void setInsertParameters(final PreparedStatement ps, final ScheduleItem item) throws Exception {
        ps.setInt(1, item.getScheduleId());
        ps.setInt(2, item.getSectionId());
        ps.setInt(3, item.getRaceId());
        ps.setObject(4, item.getLevelId());
        ps.setInt(5, item.getOrderIndex());
        ps.setInt(6, item.getIntervalMinutes());
        ps.setString(7, item.getNotes());
        ps.setTimestamp(8, Timestamp.valueOf(item.getCreatedAt()));
    }


    protected void setUpdateParameters(final PreparedStatement ps, final ScheduleItem item) throws Exception {
        ps.setInt(1, item.getScheduleId());
        ps.setInt(2, item.getSectionId());
        ps.setInt(3, item.getRaceId());
        ps.setObject(4, item.getLevelId());
        ps.setInt(5, item.getOrderIndex());
        ps.setInt(6, item.getIntervalMinutes());
        ps.setString(7, item.getNotes());
        ps.setTimestamp(8, Timestamp.valueOf(item.getCreatedAt()));
        ps.setInt(9, item.getId());
    }


    protected Integer getId(final ScheduleItem item) {
        return item.getId();
    }


    protected void setId(final ScheduleItem item, final Integer id) {
        item.setId(id);
    }


    public List<ScheduleItem> findAllByScheduleIdWithRaceAndLevel(final Integer scheduleId) {
        final String sql = "SELECT si.id as si_id, si.schedule_id as si_schedule_id, si.section_id as si_section_id, si.race_id as si_race_id, si.level_id as si_level_id, si.order_index as si_order_index, si.interval_minutes as si_interval_minutes, si.notes as si_notes, si.created_at as si_created_at, r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at, l.id as l_id, l.name as l_name, l.level_type as l_level_type, l.sort_order as l_sort_order, l.is_default as l_is_default, l.created_at as l_created_at FROM schedule_items si JOIN races r ON si.race_id = r.id LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id LEFT JOIN levels l ON si.level_id = l.id WHERE si.schedule_id = ? ORDER BY si.order_index ASC, ag.name ASC";

        return (List<ScheduleItem>) this.jdbcTemplate.query(
            "SELECT si.id as si_id, si.schedule_id as si_schedule_id, si.section_id as si_section_id, si.race_id as si_race_id, si.level_id as si_level_id, si.order_index as si_order_index, si.interval_minutes as si_interval_minutes, si.notes as si_notes, si.created_at as si_created_at, r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at, l.id as l_id, l.name as l_name, l.level_type as l_level_type, l.sort_order as l_sort_order, l.is_default as l_is_default, l.created_at as l_created_at FROM schedule_items si JOIN races r ON si.race_id = r.id LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id LEFT JOIN levels l ON si.level_id = l.id WHERE si.schedule_id = ? ORDER BY si.order_index ASC, ag.name ASC",
            (ResultSetExtractor) new ScheduleItemWithRelationshipsExtractor(), new Object[]{scheduleId});
    }


    public List<ScheduleItem> findAllBySectionIdWithRaceAndLevelAndSection(final Integer sectionId) {
        final String sql = "SELECT si.id as si_id, si.schedule_id as si_schedule_id, si.section_id as si_section_id, si.race_id as si_race_id, si.level_id as si_level_id, si.order_index as si_order_index, si.interval_minutes as si_interval_minutes, si.notes as si_notes, si.created_at as si_created_at, r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.boat_class_id as r_boat_class_id, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, bc.id as bc_id, bc.name as bc_name, bc.boat_type as bc_boat_type, bc.seat_count as bc_seat_count, bc.seat_count_text as bc_seat_count_text, bc.created_at as bc_created_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at, l.id as l_id, l.name as l_name, l.level_type as l_level_type, l.sort_order as l_sort_order, l.is_default as l_is_default, l.created_at as l_created_at, ss.id as ss_id, ss.schedule_id as ss_schedule_id, ss.day_number as ss_day_number, ss.section_type as ss_section_type, ss.start_time as ss_start_time, ss.created_at as ss_created_at FROM schedule_items si JOIN races r ON si.race_id = r.id LEFT JOIN boat_classes bc ON r.boat_class_id = bc.id LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id LEFT JOIN levels l ON si.level_id = l.id LEFT JOIN schedule_sections ss ON si.section_id = ss.id WHERE si.section_id = ? ORDER BY si.order_index ASC, ag.name ASC";

        return (List<ScheduleItem>) this.jdbcTemplate.query(sql,
            (ResultSetExtractor) new ScheduleItemWithRelationshipsAndSectionExtractor(), new Object[]{sectionId});
    }


    public void deleteAllByScheduleId(final Integer scheduleId) {
        final String sql = "DELETE FROM schedule_items WHERE schedule_id = ?";
        this.jdbcTemplate.update("DELETE FROM schedule_items WHERE schedule_id = ?", scheduleId);
    }


    public void deleteAllBySectionId(final Integer sectionId) {
        final String sql = "DELETE FROM schedule_items WHERE section_id = ?";
        this.jdbcTemplate.update("DELETE FROM schedule_items WHERE section_id = ?", sectionId);
    }

    @Override
    public List<ScheduleItem> findAllByScheduleIdOrderByOrderIndexAsc(final Integer scheduleId) {
        final String sql = "SELECT si.id as si_id, si.schedule_id as si_schedule_id, si.section_id as si_section_id, si.race_id as si_race_id, si.level_id as si_level_id, si.order_index as si_order_index, si.interval_minutes as si_interval_minutes, si.notes as si_notes, si.created_at as si_created_at, r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class, r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence, r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at, rag.race_id as rag_race_id, rag.age_group_id as rag_age_group_id, ag.id as ag_id, ag.name as ag_name, ag.created_at as ag_created_at, l.id as l_id, l.name as l_name, l.level_type as l_level_type, l.sort_order as l_sort_order, l.is_default as l_is_default, l.created_at as l_created_at FROM schedule_items si JOIN races r ON si.race_id = r.id LEFT JOIN race_age_groups rag ON r.id = rag.race_id LEFT JOIN age_groups ag ON rag.age_group_id = ag.id LEFT JOIN levels l ON si.level_id = l.id WHERE si.schedule_id = ? ORDER BY si.order_index ASC";
        return (List<ScheduleItem>) jdbcTemplate.query(sql, (ResultSetExtractor) new ScheduleItemWithRelationshipsExtractor(), scheduleId);
    }

    static class ScheduleItemWithRelationshipsAndSectionExtractor
        implements ResultSetExtractor<List<ScheduleItem>> {

        public List<ScheduleItem> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, ScheduleItem> itemMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer itemId = rs.getInt("si_id");

                ScheduleItem item = itemMap.get(itemId);
                if (item == null) {
                    item = new ScheduleItem();
                    item.setId(itemId);
                    item.setScheduleId(rs.getInt("si_schedule_id"));
                    item.setSectionId(rs.getInt("si_section_id"));
                    item.setRaceId(rs.getInt("si_race_id"));
                    item.setLevelId((Integer) rs.getObject("si_level_id"));
                    item.setOrderIndex(rs.getInt("si_order_index"));
                    item.setIntervalMinutes(rs.getInt("si_interval_minutes"));
                    item.setNotes(rs.getString("si_notes"));
                    item.setCreatedAt(rs.getTimestamp("si_created_at").toLocalDateTime());

                    final Race race = new Race();
                    race.setId(rs.getInt("r_id"));
                    race.setName(rs.getString("r_name"));
                    race.setDiscipline(rs.getString("r_discipline"));
                    race.setBoatClass(rs.getString("r_boat_class"));
                    final Integer boatClassId = (Integer) rs.getObject("r_boat_class_id");
                    race.setBoatClassId(boatClassId);
                    race.setGender(rs.getString("r_gender"));
                    race.setDistance(rs.getString("r_distance"));
                    race.setOccurrence(rs.getInt("r_occurrence"));
                    race.setHidden(rs.getBoolean("r_hidden"));
                    race.setCreatedAt(rs.getTimestamp("r_created_at").toLocalDateTime());
                    race.setUpdatedAt(rs.getTimestamp("r_updated_at").toLocalDateTime());
                    race.setAgeGroups(new ArrayList());

                    // Extract boat class data if available
                    final Integer boatClassDataId = (Integer) rs.getObject("bc_id");
                    if (boatClassDataId != null) {
                        final BoatClass boatClassData = new BoatClass();
                        boatClassData.setId(boatClassDataId);
                        boatClassData.setName(rs.getString("bc_name"));
                        boatClassData.setBoatType(rs.getString("bc_boat_type"));
                        final Integer seatCount = (Integer) rs.getObject("bc_seat_count");
                        boatClassData.setSeatCount(seatCount);
                        boatClassData.setSeatCountText(rs.getString("bc_seat_count_text"));
                        final Timestamp bcCreatedAt = rs.getTimestamp("bc_created_at");
                        if (bcCreatedAt != null) {
                            boatClassData.setCreatedAt(bcCreatedAt.toLocalDateTime());
                        }
                        race.setBoatClassData(boatClassData);
                    }

                    item.setRace(race);

                    final Integer levelId = (Integer) rs.getObject("l_id");
                    if (levelId != null) {
                        final Level level = new Level();
                        level.setId(levelId);
                        level.setName(rs.getString("l_name"));
                        level.setLevelType(rs.getString("l_level_type"));
                        level.setSortOrder(rs.getInt("l_sort_order"));
                        level.setIsDefault(rs.getBoolean("l_is_default"));
                        level.setCreatedAt(rs.getTimestamp("l_created_at").toLocalDateTime());

                        item.setLevel(level);
                    }

                    final Integer sectionId = (Integer) rs.getObject("ss_id");
                    if (sectionId != null) {
                        final ScheduleSection section = new ScheduleSection();
                        section.setId(sectionId);
                        section.setScheduleId(rs.getInt("ss_schedule_id"));
                        section.setDayNumber(rs.getInt("ss_day_number"));
                        section.setSectionType(rs.getString("ss_section_type"));
                        section.setStartTime(rs.getString("ss_start_time"));
                        section.setCreatedAt(rs.getTimestamp("ss_created_at").toLocalDateTime());

                        item.setSection(section);
                    }

                    itemMap.put(itemId, item);
                }

                final Integer ageGroupId = (Integer) rs.getObject("ag_id");
                if (ageGroupId != null) {

                    final boolean alreadyExists = item.getRace().getAgeGroups().stream()
                        .anyMatch(rag -> rag.getAgeGroupId().equals(ageGroupId));

                    if (!alreadyExists) {
                        final AgeGroup ageGroup = new AgeGroup();
                        ageGroup.setId(ageGroupId);
                        ageGroup.setName(rs.getString("ag_name"));
                        ageGroup.setCreatedAt(rs.getTimestamp("ag_created_at").toLocalDateTime());

                        final RaceAgeGroup raceAgeGroup = new RaceAgeGroup();
                        raceAgeGroup.setRaceId(rs.getInt("rag_race_id"));
                        raceAgeGroup.setAgeGroupId(ageGroupId);
                        raceAgeGroup.setRace(item.getRace());
                        raceAgeGroup.setAgeGroup(ageGroup);

                        item.getRace().getAgeGroups().add(raceAgeGroup);
                    }
                }
            }

            return new ArrayList<>(itemMap.values());
        }
    }

    static class ScheduleItemWithRelationshipsExtractor
        implements ResultSetExtractor<List<ScheduleItem>> {

        public List<ScheduleItem> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, ScheduleItem> itemMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer itemId = rs.getInt("si_id");

                ScheduleItem item = itemMap.get(itemId);
                if (item == null) {
                    item = new ScheduleItem();
                    item.setId(itemId);
                    item.setScheduleId(rs.getInt("si_schedule_id"));
                    item.setSectionId(rs.getInt("si_section_id"));
                    item.setRaceId(rs.getInt("si_race_id"));
                    item.setLevelId((Integer) rs.getObject("si_level_id"));
                    item.setOrderIndex(rs.getInt("si_order_index"));
                    item.setIntervalMinutes(rs.getInt("si_interval_minutes"));
                    item.setNotes(rs.getString("si_notes"));
                    item.setCreatedAt(rs.getTimestamp("si_created_at").toLocalDateTime());

                    final Race race = new Race();
                    race.setId(rs.getInt("r_id"));
                    race.setName(rs.getString("r_name"));
                    race.setDiscipline(rs.getString("r_discipline"));
                    race.setBoatClass(rs.getString("r_boat_class"));
                    race.setGender(rs.getString("r_gender"));
                    race.setDistance(rs.getString("r_distance"));
                    race.setOccurrence(rs.getInt("r_occurrence"));
                    race.setHidden(rs.getBoolean("r_hidden"));
                    race.setCreatedAt(rs.getTimestamp("r_created_at").toLocalDateTime());
                    race.setUpdatedAt(rs.getTimestamp("r_updated_at").toLocalDateTime());
                    race.setAgeGroups(new ArrayList());

                    item.setRace(race);

                    final Integer levelId = (Integer) rs.getObject("l_id");
                    if (levelId != null) {
                        final Level level = new Level();
                        level.setId(levelId);
                        level.setName(rs.getString("l_name"));
                        level.setLevelType(rs.getString("l_level_type"));
                        level.setSortOrder(rs.getInt("l_sort_order"));
                        level.setIsDefault(rs.getBoolean("l_is_default"));
                        level.setCreatedAt(rs.getTimestamp("l_created_at").toLocalDateTime());

                        item.setLevel(level);
                    }

                    itemMap.put(itemId, item);
                }

                final Integer ageGroupId = (Integer) rs.getObject("ag_id");
                if (ageGroupId != null) {

                    final boolean alreadyExists = item.getRace().getAgeGroups().stream()
                        .anyMatch(rag -> rag.getAgeGroupId().equals(ageGroupId));

                    if (!alreadyExists) {
                        final AgeGroup ageGroup = new AgeGroup();
                        ageGroup.setId(ageGroupId);
                        ageGroup.setName(rs.getString("ag_name"));
                        ageGroup.setCreatedAt(rs.getTimestamp("ag_created_at").toLocalDateTime());

                        final RaceAgeGroup raceAgeGroup = new RaceAgeGroup();
                        raceAgeGroup.setRaceId(rs.getInt("rag_race_id"));
                        raceAgeGroup.setAgeGroupId(ageGroupId);
                        raceAgeGroup.setRace(item.getRace());
                        raceAgeGroup.setAgeGroup(ageGroup);

                        item.getRace().getAgeGroups().add(raceAgeGroup);
                    }
                }
            }

            return new ArrayList<>(itemMap.values());
        }
    }

}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\ScheduleItemJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */