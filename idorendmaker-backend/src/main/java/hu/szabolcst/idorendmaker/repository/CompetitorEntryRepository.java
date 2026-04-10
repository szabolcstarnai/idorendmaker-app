package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompetitorEntryRepository extends JpaRepository<CompetitorEntry, Integer> {

    List<CompetitorEntry> findAllByPdfExtractionId(Integer pdfExtractionId);

    long countByPdfExtractionId(Integer pdfExtractionId);

    @Query("SELECT DISTINCT ce.organization FROM CompetitorEntry ce "
        + "WHERE ce.pdfExtractionId = :pdfExtractionId AND ce.organization IS NOT NULL")
    List<String> findDistinctOrganizationsByPdfExtractionId(@Param("pdfExtractionId") Integer pdfExtractionId);

    @Query("SELECT rca FROM RaceCompetitorAssociation rca LEFT JOIN FETCH rca.race "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId ORDER BY rca.id")
    List<RaceCompetitorAssociation> findAssociationsForPdfExtractionWithRace(
        @Param("pdfExtractionId") Integer pdfExtractionId);

    default List<CompetitorEntry> findAllWithRaceAssociationsByPdfExtractionId(final Integer pdfExtractionId) {
        final List<CompetitorEntry> entries = findAllByPdfExtractionId(pdfExtractionId);
        if (entries.isEmpty()) {
            return entries;
        }
        final List<RaceCompetitorAssociation> assocs = findAssociationsForPdfExtractionWithRace(pdfExtractionId);
        final Map<String, List<RaceCompetitorAssociation>> byCompetitor = assocs.stream()
            .filter(rca -> rca.getCompetitorId() != null)
            .collect(Collectors.groupingBy(RaceCompetitorAssociation::getCompetitorId));
        for (final CompetitorEntry ce : entries) {
            ce.setRaceCompetitorAssociations(
                byCompetitor.getOrDefault(ce.getCompetitorId(), new java.util.ArrayList<>()));
        }
        return entries;
    }
}
