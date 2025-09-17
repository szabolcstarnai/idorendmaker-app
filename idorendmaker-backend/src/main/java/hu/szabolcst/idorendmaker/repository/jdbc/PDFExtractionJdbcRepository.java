package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.PDFExtraction;
import hu.szabolcst.idorendmaker.model.entity.Schedule;
import hu.szabolcst.idorendmaker.repository.PDFExtractionRepository;
import hu.szabolcst.idorendmaker.utils.JdbcUtils;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class PDFExtractionJdbcRepository
    extends BaseJdbcRepository<PDFExtraction, Integer>
    implements PDFExtractionRepository {

    @Autowired
    private CompetitorEntryJdbcRepository competitorEntryRepository;
    @Autowired
    private RaceCompetitorAssociationJdbcRepository raceCompetitorAssociationRepository;

    public PDFExtractionJdbcRepository() {
        super(PDFExtraction.class);
    }

    protected String getTableName() {
        return "pdf_extractions";
    }

    protected String getIdColumnName() {
        return "id";
    }

    protected String getInsertSql() {
        return "INSERT INTO pdf_extractions (filename, file_hash, total_races, total_competitors, total_entries, extraction_status, status, linked_at, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    }

    protected String getUpdateSql() {
        return "UPDATE pdf_extractions SET filename = ?, file_hash = ?, total_races = ?, total_competitors = ?, total_entries = ?, extraction_status = ?, status = ?, linked_at = ?, expires_at = ? WHERE id = ?";
    }

    protected void setInsertParameters(final PreparedStatement ps, final PDFExtraction extraction) throws Exception {
        ps.setString(1, extraction.getFilename());
        ps.setString(2, extraction.getFileHash());
        ps.setInt(3, extraction.getTotalRaces());
        ps.setInt(4, extraction.getTotalCompetitors());
        ps.setInt(5, extraction.getTotalEntries());
        ps.setString(6, extraction.getExtractionStatus());
        ps.setString(7, extraction.getStatus());
        ps.setTimestamp(8, (extraction.getLinkedAt() != null) ? Timestamp.valueOf(extraction.getLinkedAt()) : null);
        ps.setTimestamp(9, Timestamp.valueOf(extraction.getCreatedAt()));
        ps.setTimestamp(10, (extraction.getExpiresAt() != null) ? Timestamp.valueOf(extraction.getExpiresAt()) : null);
    }

    protected void setUpdateParameters(final PreparedStatement ps, final PDFExtraction extraction) throws Exception {
        ps.setString(1, extraction.getFilename());
        ps.setString(2, extraction.getFileHash());
        ps.setInt(3, extraction.getTotalRaces());
        ps.setInt(4, extraction.getTotalCompetitors());
        ps.setInt(5, extraction.getTotalEntries());
        ps.setString(6, extraction.getExtractionStatus());
        ps.setString(7, extraction.getStatus());
        ps.setTimestamp(8, (extraction.getLinkedAt() != null) ? Timestamp.valueOf(extraction.getLinkedAt()) : null);
        ps.setTimestamp(9, (extraction.getExpiresAt() != null) ? Timestamp.valueOf(extraction.getExpiresAt()) : null);
        ps.setInt(10, extraction.getId());
    }

    protected Integer getId(final PDFExtraction extraction) {
        return extraction.getId();
    }

    protected void setId(final PDFExtraction extraction, final Integer id) {
        extraction.setId(id);
    }

    public Optional<PDFExtraction> findByFileHash(final String fileHash) {
        try {
            final String sql = "SELECT * FROM pdf_extractions WHERE file_hash = ?";
            final PDFExtraction extraction = (PDFExtraction) this.jdbcTemplate.queryForObject(sql,
                (RowMapper) this.rowMapper, new Object[]{fileHash});
            return Optional.ofNullable(extraction);
        } catch (final Exception e) {
            return Optional.empty();
        }
    }

    public List<PDFExtraction> findAllWithSchedulesOrderByCreatedAtDesc() {
        final String sql = "    SELECT\n        pe.id as pe_id, pe.filename as pe_filename, pe.file_hash as pe_file_hash,\n        pe.total_races as pe_total_races, pe.total_competitors as pe_total_competitors,\n        pe.total_entries as pe_total_entries, pe.extraction_status as pe_extraction_status,\n        pe.status as pe_status, pe.linked_at as pe_linked_at, pe.created_at as pe_created_at,\n        pe.expires_at as pe_expires_at,\n        s.id as s_id, s.name as s_name, s.pdf_extraction_id as s_pdf_extraction_id,\n        s.created_at as s_created_at, s.updated_at as s_updated_at\n    FROM pdf_extractions pe\n    LEFT JOIN schedules s ON pe.id = s.pdf_extraction_id\n    ORDER BY pe.created_at DESC, s.id\n";
        return this.jdbcTemplate.query(sql, this::mapPDFExtractionWithSchedules);
    }

    public List<PDFExtraction> findExpiredSessionExtractions(final LocalDateTime now) {
        final String sql = "SELECT * FROM pdf_extractions WHERE status = 'session' AND expires_at < ?";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper, Timestamp.valueOf(now));
    }

    public Optional<PDFExtraction> findByIdWithSchedules(final Integer id) {
        final String sql = "    SELECT\n        pe.id as pe_id, pe.filename as pe_filename, pe.file_hash as pe_file_hash,\n        pe.total_races as pe_total_races, pe.total_competitors as pe_total_competitors,\n        pe.total_entries as pe_total_entries, pe.extraction_status as pe_extraction_status,\n        pe.status as pe_status, pe.linked_at as pe_linked_at, pe.created_at as pe_created_at,\n        pe.expires_at as pe_expires_at,\n        s.id as s_id, s.name as s_name, s.pdf_extraction_id as s_pdf_extraction_id,\n        s.created_at as s_created_at, s.updated_at as s_updated_at\n    FROM pdf_extractions pe\n    LEFT JOIN schedules s ON pe.id = s.pdf_extraction_id\n    WHERE pe.id = ?\n    ORDER BY s.id\n";
        final List<PDFExtraction> results = this.jdbcTemplate.query(sql, this::mapPDFExtractionWithSchedules, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public long countByStatus(final String status) {
        final String sql = "SELECT COUNT(*) FROM pdf_extractions WHERE status = ?";
        return this.jdbcTemplate.queryForObject(sql, Long.class,
            status);
    }

    public List<PDFExtraction> findByStatusOrderByCreatedAtDesc(final String status) {
        final String sql = "SELECT * FROM pdf_extractions WHERE status = ? ORDER BY created_at DESC";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper, status);
    }

    public List<PDFExtraction> findDeletableExtractions() {
        final String sql = "SELECT * FROM pdf_extractions WHERE status = 'session' AND NOT EXISTS (SELECT 1 FROM schedules s WHERE s.pdf_extraction_id = pdf_extractions.id)";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper);
    }

    public void deleteById(final Integer id) {
        final String deleteAssociationsSql = "DELETE FROM race_competitor_associations WHERE pdf_extraction_id = ?";
        this.jdbcTemplate.update(deleteAssociationsSql, id);

        final String deleteEntriesSql = "DELETE FROM competitor_entries WHERE pdf_extraction_id = ?";
        this.jdbcTemplate.update(deleteEntriesSql, id);

        super.deleteById(id);
    }


    private List<PDFExtraction> mapPDFExtractionWithSchedules(final ResultSet rs) throws SQLException {
        final Map<Integer, PDFExtraction> pdfExtractionMap = new LinkedHashMap<>();

        while (rs.next()) {

            final Integer pdfExtractionId = rs.getInt("pe_id");

            PDFExtraction pdfExtraction = pdfExtractionMap.get(pdfExtractionId);
            if (pdfExtraction == null) {
                pdfExtraction = new PDFExtraction();
                pdfExtraction.setId(pdfExtractionId);
                pdfExtraction.setFilename(rs.getString("pe_filename"));
                pdfExtraction.setFileHash(rs.getString("pe_file_hash"));
                pdfExtraction.setTotalRaces(rs.getInt("pe_total_races"));
                pdfExtraction.setTotalCompetitors(rs.getInt("pe_total_competitors"));
                pdfExtraction.setTotalEntries(rs.getInt("pe_total_entries"));
                pdfExtraction.setExtractionStatus(rs.getString("pe_extraction_status"));
                pdfExtraction.setStatus(rs.getString("pe_status"));
                final Timestamp linkedAt = rs.getTimestamp("pe_linked_at");
                if (linkedAt != null) {
                    pdfExtraction.setLinkedAt(linkedAt.toLocalDateTime());
                }
                final Timestamp createdAt = rs.getTimestamp("pe_created_at");
                if (createdAt != null) {
                    pdfExtraction.setCreatedAt(createdAt.toLocalDateTime());
                }
                final Timestamp expiresAt = rs.getTimestamp("pe_expires_at");
                if (expiresAt != null) {
                    pdfExtraction.setExpiresAt(expiresAt.toLocalDateTime());
                }
                pdfExtraction.setSchedules(new ArrayList<>());
                pdfExtractionMap.put(pdfExtractionId, pdfExtraction);
            }

            final Integer scheduleId = JdbcUtils.getIntegerOrNull(rs, "s_id");
            if (scheduleId != null) {

                final boolean scheduleExists = pdfExtraction.getSchedules().stream().anyMatch(s -> scheduleId.equals(s.getId()));

                if (!scheduleExists) {
                    final Schedule schedule = new Schedule();
                    schedule.setId(scheduleId);
                    schedule.setName(rs.getString("s_name"));
                    schedule.setPdfExtractionId(rs.getInt("s_pdf_extraction_id"));
                    final Timestamp scheduleCreatedAt = rs.getTimestamp("s_created_at");
                    if (scheduleCreatedAt != null) {
                        schedule.setCreatedAt(scheduleCreatedAt.toLocalDateTime());
                    }
                    final Timestamp scheduleUpdatedAt = rs.getTimestamp("s_updated_at");
                    if (scheduleUpdatedAt != null) {
                        schedule.setUpdatedAt(scheduleUpdatedAt.toLocalDateTime());
                    }

                    pdfExtraction.getSchedules().add(schedule);
                }
            }
        }

        return new ArrayList<>(pdfExtractionMap.values());
    }
}