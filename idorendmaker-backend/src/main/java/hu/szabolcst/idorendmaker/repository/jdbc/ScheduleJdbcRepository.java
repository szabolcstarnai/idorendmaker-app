package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import hu.szabolcst.idorendmaker.model.entity.ScheduleSection;
import hu.szabolcst.idorendmaker.repository.ScheduleRepository;
import hu.szabolcst.idorendmaker.utils.JdbcUtils;
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
public class ScheduleJdbcRepository
    extends BaseJdbcRepository<Schedule, Integer>
    implements ScheduleRepository {

    @Autowired
    private ScheduleSectionJdbcRepository scheduleSectionRepository;
    @Autowired
    private ScheduleItemJdbcRepository scheduleItemRepository;
    @Autowired
    private DismissedRuleViolationJdbcRepository dismissedRuleViolationRepository;

    public ScheduleJdbcRepository() {
        super(Schedule.class);
    }


    protected String getTableName() {
        return "schedules";
    }


    protected String getIdColumnName() {
        return "id";
    }


    protected String getInsertSql() {
        return "INSERT INTO schedules (name, pdf_extraction_id, created_at, updated_at) VALUES (?, ?, ?, ?)";
    }


    protected String getUpdateSql() {
        return "UPDATE schedules SET name = ?, pdf_extraction_id = ?, updated_at = ? WHERE id = ?";
    }


    protected void setInsertParameters(final PreparedStatement ps, final Schedule schedule) throws Exception {
        ps.setString(1, schedule.getName());
        ps.setObject(2, schedule.getPdfExtractionId());
        ps.setTimestamp(3, Timestamp.valueOf(schedule.getCreatedAt()));
        ps.setTimestamp(4, Timestamp.valueOf(schedule.getUpdatedAt()));
    }


    protected void setUpdateParameters(final PreparedStatement ps, final Schedule schedule) throws Exception {
        ps.setString(1, schedule.getName());
        ps.setObject(2, schedule.getPdfExtractionId());
        ps.setTimestamp(3, Timestamp.valueOf(schedule.getUpdatedAt()));
        ps.setInt(4, schedule.getId());
    }


    protected Integer getId(final Schedule schedule) {
        return schedule.getId();
    }


    protected void setId(final Schedule schedule, final Integer id) {
        schedule.setId(id);
    }


    public List<Schedule> findAllByOrderByCreatedAtDesc() {
        final String sql = "SELECT * FROM schedules ORDER BY created_at DESC";
        return this.jdbcTemplate.query("SELECT * FROM schedules ORDER BY created_at DESC", (RowMapper) this.rowMapper);
    }


    public Optional<Schedule> findByIdWithSections(final Integer scheduleId) {
        final String sql = "    SELECT DISTINCT\n        s.id as s_id, s.name as s_name, s.pdf_extraction_id as s_pdf_extraction_id,\n        s.created_at as s_created_at, s.updated_at as s_updated_at,\n        sec.id as sec_id, sec.schedule_id as sec_schedule_id, sec.day_number as sec_day_number,\n        sec.section_type as sec_section_type, sec.start_time as sec_start_time, sec.created_at as sec_created_at,\n        pe.id as pe_id, pe.filename as pe_filename, pe.file_hash as pe_file_hash,\n        pe.total_races as pe_total_races, pe.total_competitors as pe_total_competitors,\n        pe.total_entries as pe_total_entries, pe.extraction_status as pe_extraction_status,\n        pe.status as pe_status, pe.linked_at as pe_linked_at, pe.created_at as pe_created_at,\n        pe.expires_at as pe_expires_at\n    FROM schedules s\n    LEFT JOIN schedule_sections sec ON s.id = sec.schedule_id\n    LEFT JOIN pdf_extractions pe ON s.pdf_extraction_id = pe.id\n    WHERE s.id = ?\n    ORDER BY sec.day_number ASC, sec.section_type ASC\n";

        final List<Schedule> results = (List<Schedule>) this.jdbcTemplate.query(
            "    SELECT DISTINCT\n        s.id as s_id, s.name as s_name, s.pdf_extraction_id as s_pdf_extraction_id,\n        s.created_at as s_created_at, s.updated_at as s_updated_at,\n        sec.id as sec_id, sec.schedule_id as sec_schedule_id, sec.day_number as sec_day_number,\n        sec.section_type as sec_section_type, sec.start_time as sec_start_time, sec.created_at as sec_created_at,\n        pe.id as pe_id, pe.filename as pe_filename, pe.file_hash as pe_file_hash,\n        pe.total_races as pe_total_races, pe.total_competitors as pe_total_competitors,\n        pe.total_entries as pe_total_entries, pe.extraction_status as pe_extraction_status,\n        pe.status as pe_status, pe.linked_at as pe_linked_at, pe.created_at as pe_created_at,\n        pe.expires_at as pe_expires_at\n    FROM schedules s\n    LEFT JOIN schedule_sections sec ON s.id = sec.schedule_id\n    LEFT JOIN pdf_extractions pe ON s.pdf_extraction_id = pe.id\n    WHERE s.id = ?\n    ORDER BY sec.day_number ASC, sec.section_type ASC\n",
            (ResultSetExtractor) new ScheduleWithSectionsExtractor(), new Object[]{scheduleId});
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }


    public void deleteById(final Integer id) {
        this.scheduleItemRepository.deleteAllByScheduleId(id);

        this.scheduleSectionRepository.deleteAllByScheduleId(id);

        this.dismissedRuleViolationRepository.deleteByScheduleId(id);

        super.deleteById(id);
    }

    @Override
    public long countByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "SELECT COUNT(*) FROM schedules WHERE pdf_extraction_id = ?";
        return jdbcTemplate.queryForObject(sql, Long.class, pdfExtractionId);
    }


    private static int getIntOrDefault(final ResultSet rs, final String columnName, final int defaultValue) throws SQLException {
        final Integer value = JdbcUtils.getIntegerOrNull(rs, columnName);
        return (value != null) ? value : defaultValue;
    }

    static class ScheduleWithSectionsExtractor
        implements ResultSetExtractor<List<Schedule>> {

        public List<Schedule> extractData(final ResultSet rs) throws SQLException {
            final Map<Integer, Schedule> scheduleMap = new LinkedHashMap<>();

            while (rs.next()) {
                final Integer scheduleId = rs.getInt("s_id");

                Schedule schedule = scheduleMap.get(scheduleId);
                if (schedule == null) {
                    schedule = new Schedule();
                    schedule.setId(scheduleId);
                    schedule.setName(rs.getString("s_name"));

                    final Object pdfExtractionIdObj = rs.getObject("s_pdf_extraction_id");
                    if (pdfExtractionIdObj != null && !rs.wasNull()) {
                        try {
                            schedule.setPdfExtractionId((Integer) pdfExtractionIdObj);
                        } catch (final ClassCastException e) {

                            if (pdfExtractionIdObj instanceof Number) {
                                schedule.setPdfExtractionId(((Number) pdfExtractionIdObj).intValue());
                            } else {
                                schedule.setPdfExtractionId(null);
                            }
                        }
                    } else {
                        schedule.setPdfExtractionId(null);
                    }

                    final Timestamp sCreatedAt = rs.getTimestamp("s_created_at");
                    if (sCreatedAt != null) {
                        schedule.setCreatedAt(sCreatedAt.toLocalDateTime());
                    }
                    final Timestamp sUpdatedAt = rs.getTimestamp("s_updated_at");
                    if (sUpdatedAt != null) {
                        schedule.setUpdatedAt(sUpdatedAt.toLocalDateTime());
                    }
                    schedule.setSections(new ArrayList<>());

                    final Integer pdfExtractionId = JdbcUtils.getIntegerOrNull(rs, "pe_id");
                    if (pdfExtractionId != null) {
                        final PDFExtraction pdfExtraction = new PDFExtraction();
                        pdfExtraction.setId(pdfExtractionId);
                        pdfExtraction.setFilename(rs.getString("pe_filename"));
                        pdfExtraction.setFileHash(rs.getString("pe_file_hash"));
                        pdfExtraction.setTotalRaces(ScheduleJdbcRepository.getIntOrDefault(rs, "pe_total_races", 0));
                        pdfExtraction.setTotalCompetitors(ScheduleJdbcRepository.getIntOrDefault(rs, "pe_total_competitors", 0));
                        pdfExtraction.setTotalEntries(ScheduleJdbcRepository.getIntOrDefault(rs, "pe_total_entries", 0));
                        pdfExtraction.setExtractionStatus(rs.getString("pe_extraction_status"));
                        pdfExtraction.setStatus(rs.getString("pe_status"));
                        final Timestamp peLinkedAt = rs.getTimestamp("pe_linked_at");
                        if (peLinkedAt != null) {
                            pdfExtraction.setLinkedAt(peLinkedAt.toLocalDateTime());
                        }
                        final Timestamp peCreatedAt = rs.getTimestamp("pe_created_at");
                        if (peCreatedAt != null) {
                            pdfExtraction.setCreatedAt(peCreatedAt.toLocalDateTime());
                        }
                        final Timestamp peExpiresAt = rs.getTimestamp("pe_expires_at");
                        if (peExpiresAt != null) {
                            pdfExtraction.setExpiresAt(peExpiresAt.toLocalDateTime());
                        }
                        schedule.setPdfExtraction(pdfExtraction);
                    }

                    scheduleMap.put(scheduleId, schedule);
                }

                final Integer sectionId = JdbcUtils.getIntegerOrNull(rs, "sec_id");
                if (sectionId != null) {

                    final boolean alreadyExists = schedule.getSections().stream().anyMatch(sec -> sec.getId().equals(sectionId));

                    if (!alreadyExists) {
                        final ScheduleSection section = new ScheduleSection();
                        section.setId(sectionId);
                        section.setScheduleId(ScheduleJdbcRepository.getIntOrDefault(rs, "sec_schedule_id", 0));
                        section.setDayNumber(ScheduleJdbcRepository.getIntOrDefault(rs, "sec_day_number", 1));
                        section.setSectionType(rs.getString("sec_section_type"));
                        section.setStartTime(rs.getString("sec_start_time"));
                        final Timestamp secCreatedAt = rs.getTimestamp("sec_created_at");
                        if (secCreatedAt != null) {
                            section.setCreatedAt(secCreatedAt.toLocalDateTime());
                        }
                        section.setSchedule(schedule);

                        schedule.getSections().add(section);
                    }
                }
            }

            return new ArrayList<>(scheduleMap.values());
        }
    }

}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\ScheduleJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */