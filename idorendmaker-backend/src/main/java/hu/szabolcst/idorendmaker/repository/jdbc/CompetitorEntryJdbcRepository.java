package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import hu.szabolcst.idorendmaker.repository.CompetitorEntryRepository;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;


@Repository
public class CompetitorEntryJdbcRepository
    extends BaseJdbcRepository<CompetitorEntry, Integer>
    implements CompetitorEntryRepository {

    public CompetitorEntryJdbcRepository() {
        super(CompetitorEntry.class);
    }

    protected String getTableName() {
        return "competitor_entries";
    }

    protected String getIdColumnName() {
        return "id";
    }

    protected String getInsertSql() {
        return "INSERT INTO competitor_entries (pdf_extraction_id, competitor_id, competitor_name, organization, birth_year, created_at) VALUES (?, ?, ?, ?, ?, ?)";
    }

    protected String getUpdateSql() {
        return "UPDATE competitor_entries SET pdf_extraction_id = ?, competitor_id = ?, competitor_name = ?, organization = ?, birth_year = ?, created_at = ? WHERE id = ?";
    }

    protected void setInsertParameters(final PreparedStatement ps, final CompetitorEntry entry) throws Exception {
        ps.setInt(1, entry.getPdfExtractionId());
        ps.setString(2, entry.getCompetitorId());
        ps.setString(3, entry.getCompetitorName());
        ps.setString(4, entry.getOrganization());
        ps.setObject(5, entry.getBirthYear());
        ps.setTimestamp(6, Timestamp.valueOf(entry.getCreatedAt()));
    }

    protected void setUpdateParameters(final PreparedStatement ps, final CompetitorEntry entry) throws Exception {
        ps.setInt(1, entry.getPdfExtractionId());
        ps.setString(2, entry.getCompetitorId());
        ps.setString(3, entry.getCompetitorName());
        ps.setString(4, entry.getOrganization());
        ps.setObject(5, entry.getBirthYear());
        ps.setTimestamp(6, Timestamp.valueOf(entry.getCreatedAt()));
        ps.setInt(7, entry.getId());
    }

    protected Integer getId(final CompetitorEntry entry) {
        return entry.getId();
    }

    protected void setId(final CompetitorEntry entry, final Integer id) {
        entry.setId(id);
    }

    public List<CompetitorEntry> findAllWithRaceAssociationsByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "    SELECT DISTINCT\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at,\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        r.id as r_id, r.name as r_name, r.discipline as r_discipline, r.boat_class as r_boat_class,\n        r.gender as r_gender, r.distance as r_distance, r.occurrence as r_occurrence,\n        r.hidden as r_hidden, r.created_at as r_created_at, r.updated_at as r_updated_at\n    FROM competitor_entries ce\n    LEFT JOIN race_competitor_associations rca ON ce.pdf_extraction_id = rca.pdf_extraction_id\n        AND ce.competitor_id = rca.competitor_id\n    LEFT JOIN races r ON rca.race_id = r.id\n    WHERE ce.pdf_extraction_id = ?\n    ORDER BY ce.id, rca.id\n";
        return this.jdbcTemplate.query(sql, this::mapCompetitorEntryWithRaceAssociations, pdfExtractionId);
    }

    public long countByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "SELECT COUNT(*) FROM competitor_entries WHERE pdf_extraction_id = ?";
        return this.jdbcTemplate.queryForObject(sql, Long.class,
            pdfExtractionId);
    }

    public List<String> findDistinctOrganizationsByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "SELECT DISTINCT organization FROM competitor_entries WHERE pdf_extraction_id = ? AND organization IS NOT NULL";
        return this.jdbcTemplate.queryForList(sql, String.class, pdfExtractionId);
    }

    public List<CompetitorEntry> findAllByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "SELECT * FROM competitor_entries WHERE pdf_extraction_id = ?";
        return this.jdbcTemplate.query(sql, (RowMapper) this.rowMapper, pdfExtractionId);
    }

    private List<CompetitorEntry> mapCompetitorEntryWithRaceAssociations(final ResultSet rs) throws SQLException {
        final Map<Integer, CompetitorEntry> competitorMap = new LinkedHashMap<>();
        while (rs.next()) {

            final Integer competitorEntryId = rs.getInt("ce_id");

            CompetitorEntry competitor = competitorMap.get(competitorEntryId);
            if (competitor == null) {
                competitor = new CompetitorEntry();
                competitor.setId(competitorEntryId);
                competitor.setPdfExtractionId(rs.getInt("ce_pdf_extraction_id"));
                competitor.setCompetitorId(rs.getString("ce_competitor_id"));
                competitor.setCompetitorName(rs.getString("ce_competitor_name"));
                competitor.setOrganization(rs.getString("ce_organization"));
                final Integer birthYear = rs.<Integer>getObject("ce_birth_year", Integer.class);
                competitor.setBirthYear(birthYear);
                final Timestamp createdAt = rs.getTimestamp("ce_created_at");
                if (createdAt != null) {
                    competitor.setCreatedAt(createdAt.toLocalDateTime());
                }
                competitor.setRaceCompetitorAssociations(new ArrayList<>());
                competitorMap.put(competitorEntryId, competitor);
            }

            final Integer rcaId = rs.<Integer>getObject("rca_id", Integer.class);
            if (rcaId != null) {

                final boolean associationExists = competitor.getRaceCompetitorAssociations().stream()
                    .anyMatch(rca -> rcaId.equals(rca.getId()));

                if (!associationExists) {
                    final RaceCompetitorAssociation association = new RaceCompetitorAssociation();
                    association.setId(rcaId);
                    association.setPdfExtractionId(rs.getInt("rca_pdf_extraction_id"));
                    association.setRaceId(rs.getInt("rca_race_id"));
                    association.setCompetitorId(rs.getString("rca_competitor_id"));
                    association.setPdfRaceName(rs.getString("rca_pdf_race_name"));
                    association.setMatchConfidence(rs.getFloat("rca_match_confidence"));
                    final Timestamp rcaCreatedAt = rs.getTimestamp("rca_created_at");
                    if (rcaCreatedAt != null) {
                        association.setCreatedAt(rcaCreatedAt.toLocalDateTime());
                    }

                    final Integer raceId = rs.<Integer>getObject("r_id", Integer.class);
                    if (raceId != null) {
                        final Race race = new Race();
                        race.setId(raceId);
                        race.setName(rs.getString("r_name"));
                        race.setDiscipline(rs.getString("r_discipline"));
                        race.setBoatClass(rs.getString("r_boat_class"));
                        race.setGender(rs.getString("r_gender"));
                        race.setDistance(rs.getString("r_distance"));
                        race.setOccurrence(rs.getInt("r_occurrence"));
                        race.setHidden(rs.getBoolean("r_hidden"));
                        final Timestamp raceCreatedAt = rs.getTimestamp("r_created_at");
                        if (raceCreatedAt != null) {
                            race.setCreatedAt(raceCreatedAt.toLocalDateTime());
                        }
                        final Timestamp raceUpdatedAt = rs.getTimestamp("r_updated_at");
                        if (raceUpdatedAt != null) {
                            race.setUpdatedAt(raceUpdatedAt.toLocalDateTime());
                        }

                        association.setRace(race);
                    }

                    competitor.getRaceCompetitorAssociations().add(association);
                }
            }
        }

        return new ArrayList<>(competitorMap.values());
    }

}