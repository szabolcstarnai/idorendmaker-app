package hu.szabolcst.idorendmaker.repository.jdbc;

import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import hu.szabolcst.idorendmaker.repository.RaceCompetitorAssociationRepository;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class RaceCompetitorAssociationJdbcRepository
    extends BaseJdbcRepository<RaceCompetitorAssociation, Integer>
    implements RaceCompetitorAssociationRepository {

    public RaceCompetitorAssociationJdbcRepository() {
        super(RaceCompetitorAssociation.class);
    }


    protected String getTableName() {
        return "race_competitor_associations";
    }


    protected String getIdColumnName() {
        return "id";
    }


    protected String getInsertSql() {
        return "INSERT INTO race_competitor_associations (pdf_extraction_id, race_id, competitor_id, pdf_race_name, match_confidence, created_at) VALUES (?, ?, ?, ?, ?, ?)";
    }


    protected String getUpdateSql() {
        return "UPDATE race_competitor_associations SET pdf_extraction_id = ?, race_id = ?, competitor_id = ?, pdf_race_name = ?, match_confidence = ?, created_at = ? WHERE id = ?";
    }


    protected void setInsertParameters(final PreparedStatement ps, final RaceCompetitorAssociation association) throws Exception {
        ps.setInt(1, association.getPdfExtractionId());
        ps.setInt(2, association.getRaceId());
        ps.setString(3, association.getCompetitorId());
        ps.setString(4, association.getPdfRaceName());
        ps.setFloat(5, association.getMatchConfidence());
        ps.setTimestamp(6, Timestamp.valueOf(association.getCreatedAt()));
    }


    protected void setUpdateParameters(final PreparedStatement ps, final RaceCompetitorAssociation association) throws Exception {
        ps.setInt(1, association.getPdfExtractionId());
        ps.setInt(2, association.getRaceId());
        ps.setString(3, association.getCompetitorId());
        ps.setString(4, association.getPdfRaceName());
        ps.setFloat(5, association.getMatchConfidence());
        ps.setTimestamp(6, Timestamp.valueOf(association.getCreatedAt()));
        ps.setInt(7, association.getId());
    }


    protected Integer getId(final RaceCompetitorAssociation association) {
        return association.getId();
    }


    protected void setId(final RaceCompetitorAssociation association, final Integer id) {
        association.setId(id);
    }


    public List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceIdWithCompetitor(final Integer pdfExtractionId,
        final Integer raceId) {
        final String sql = "    SELECT\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at\n    FROM race_competitor_associations rca\n    JOIN competitor_entries ce ON rca.pdf_extraction_id = ce.pdf_extraction_id\n        AND rca.competitor_id = ce.competitor_id\n    WHERE rca.pdf_extraction_id = ? AND rca.race_id = ?\n    ORDER BY rca.id\n";

        return this.jdbcTemplate.query(
            "    SELECT\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at\n    FROM race_competitor_associations rca\n    JOIN competitor_entries ce ON rca.pdf_extraction_id = ce.pdf_extraction_id\n        AND rca.competitor_id = ce.competitor_id\n    WHERE rca.pdf_extraction_id = ? AND rca.race_id = ?\n    ORDER BY rca.id\n",
            this::mapRaceCompetitorAssociationWithCompetitor, new Object[]{pdfExtractionId, raceId});
    }


    public long countByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "SELECT COUNT(*) FROM race_competitor_associations WHERE pdf_extraction_id = ?";
        return this.jdbcTemplate.queryForObject("SELECT COUNT(*) FROM race_competitor_associations WHERE pdf_extraction_id = ?",
            Long.class, new Object[]{pdfExtractionId});
    }


    public List<Integer> findDistinctRaceIdsByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "SELECT DISTINCT race_id FROM race_competitor_associations WHERE pdf_extraction_id = ?";
        return this.jdbcTemplate.queryForList("SELECT DISTINCT race_id FROM race_competitor_associations WHERE pdf_extraction_id = ?",
            Integer.class,
            pdfExtractionId);
    }


    public List<RaceCompetitorAssociation> findConflictingCompetitorsBetweenRaces(final Integer pdfExtractionId, final Integer race1Id,
        final Integer race2Id) {
        final String sql = "    SELECT\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at\n    FROM race_competitor_associations rca\n    JOIN competitor_entries ce ON rca.pdf_extraction_id = ce.pdf_extraction_id\n        AND rca.competitor_id = ce.competitor_id\n    WHERE rca.pdf_extraction_id = ?\n        AND rca.race_id = ?\n        AND rca.competitor_id IN (\n            SELECT rca2.competitor_id FROM race_competitor_associations rca2\n            WHERE rca2.pdf_extraction_id = ?\n            AND rca2.race_id = ?\n        )\n    ORDER BY rca.id\n";

        return this.jdbcTemplate.query(
            "    SELECT\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at\n    FROM race_competitor_associations rca\n    JOIN competitor_entries ce ON rca.pdf_extraction_id = ce.pdf_extraction_id\n        AND rca.competitor_id = ce.competitor_id\n    WHERE rca.pdf_extraction_id = ?\n        AND rca.race_id = ?\n        AND rca.competitor_id IN (\n            SELECT rca2.competitor_id FROM race_competitor_associations rca2\n            WHERE rca2.pdf_extraction_id = ?\n            AND rca2.race_id = ?\n        )\n    ORDER BY rca.id\n",
            this::mapRaceCompetitorAssociationWithCompetitor, new Object[]{pdfExtractionId, race1Id, pdfExtractionId, race2Id});
    }


    public List<RaceCompetitorAssociation> findAllByPdfExtractionId(final Integer pdfExtractionId) {
        final String sql = "    SELECT\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at\n    FROM race_competitor_associations rca\n    JOIN competitor_entries ce ON rca.pdf_extraction_id = ce.pdf_extraction_id\n        AND rca.competitor_id = ce.competitor_id\n    WHERE rca.pdf_extraction_id = ?\n    ORDER BY rca.id\n";

        return this.jdbcTemplate.query(
            "    SELECT\n        rca.id as rca_id, rca.pdf_extraction_id as rca_pdf_extraction_id, rca.race_id as rca_race_id,\n        rca.competitor_id as rca_competitor_id, rca.pdf_race_name as rca_pdf_race_name,\n        rca.match_confidence as rca_match_confidence, rca.created_at as rca_created_at,\n        ce.id as ce_id, ce.pdf_extraction_id as ce_pdf_extraction_id, ce.competitor_id as ce_competitor_id,\n        ce.competitor_name as ce_competitor_name, ce.organization as ce_organization,\n        ce.birth_year as ce_birth_year, ce.created_at as ce_created_at\n    FROM race_competitor_associations rca\n    JOIN competitor_entries ce ON rca.pdf_extraction_id = ce.pdf_extraction_id\n        AND rca.competitor_id = ce.competitor_id\n    WHERE rca.pdf_extraction_id = ?\n    ORDER BY rca.id\n",
            this::mapRaceCompetitorAssociationWithCompetitor, new Object[]{pdfExtractionId});
    }


    private List<RaceCompetitorAssociation> mapRaceCompetitorAssociationWithCompetitor(final ResultSet rs) throws SQLException {
        final List<RaceCompetitorAssociation> associations = new ArrayList<>();

        while (rs.next()) {

            final RaceCompetitorAssociation association = new RaceCompetitorAssociation();
            association.setId(rs.getInt("rca_id"));
            association.setPdfExtractionId(rs.getInt("rca_pdf_extraction_id"));
            association.setRaceId(rs.getInt("rca_race_id"));
            association.setCompetitorId(rs.getString("rca_competitor_id"));
            association.setPdfRaceName(rs.getString("rca_pdf_race_name"));
            association.setMatchConfidence(rs.getFloat("rca_match_confidence"));
            final Timestamp rcaCreatedAt = rs.getTimestamp("rca_created_at");
            if (rcaCreatedAt != null) {
                association.setCreatedAt(rcaCreatedAt.toLocalDateTime());
            }

            final CompetitorEntry competitorEntry = new CompetitorEntry();
            competitorEntry.setId(rs.getInt("ce_id"));
            competitorEntry.setPdfExtractionId(rs.getInt("ce_pdf_extraction_id"));
            competitorEntry.setCompetitorId(rs.getString("ce_competitor_id"));
            competitorEntry.setCompetitorName(rs.getString("ce_competitor_name"));
            competitorEntry.setOrganization(rs.getString("ce_organization"));
            final Integer birthYear = rs.<Integer>getObject("ce_birth_year", Integer.class);
            competitorEntry.setBirthYear(birthYear);
            final Timestamp ceCreatedAt = rs.getTimestamp("ce_created_at");
            if (ceCreatedAt != null) {
                competitorEntry.setCreatedAt(ceCreatedAt.toLocalDateTime());
            }

            association.setCompetitorEntry(competitorEntry);

            associations.add(association);
        }

        return associations;
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\repository\jdbc\RaceCompetitorAssociationJdbcRepository.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */