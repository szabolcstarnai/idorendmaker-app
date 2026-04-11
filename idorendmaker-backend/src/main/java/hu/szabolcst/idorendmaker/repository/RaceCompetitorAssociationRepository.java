package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RaceCompetitorAssociationRepository extends JpaRepository<RaceCompetitorAssociation, Integer> {

    long countByPdfExtractionId(Integer pdfExtractionId);

    @Query("SELECT DISTINCT rca.raceCode FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId")
    List<String> findDistinctRaceCodesByPdfExtractionId(@Param("pdfExtractionId") Integer pdfExtractionId);

    List<RaceCompetitorAssociation> findAllByPdfExtractionId(Integer pdfExtractionId);

    default List<RaceCompetitorAssociation> findAllByPdfExtractionIdWithCompetitor(final Integer pdfExtractionId) {
        final List<RaceCompetitorAssociation> associations = findAllByPdfExtractionId(pdfExtractionId);
        enrichWithCompetitorEntries(associations, pdfExtractionId);
        return associations;
    }

    @Query("SELECT rca FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId AND rca.raceCode = :raceCode "
        + "ORDER BY rca.id")
    List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceCodeRaw(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("raceCode") String raceCode);

    @Query("SELECT rca FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId AND rca.raceCode IN :raceCodes "
        + "ORDER BY rca.raceCode, rca.id")
    List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceCodesRaw(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("raceCodes") List<String> raceCodes);

    @Query("SELECT rca FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId "
        + "AND rca.raceCode = :raceACode "
        + "AND rca.competitorId IN ("
        + "    SELECT rca2.competitorId FROM RaceCompetitorAssociation rca2 "
        + "    WHERE rca2.pdfExtractionId = :pdfExtractionId AND rca2.raceCode = :raceBCode"
        + ") ORDER BY rca.id")
    List<RaceCompetitorAssociation> findConflictingCompetitorsBetweenRacesRaw(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("raceACode") String raceACode,
        @Param("raceBCode") String raceBCode);

    @Query("SELECT ce FROM CompetitorEntry ce "
        + "WHERE ce.pdfExtractionId = :pdfExtractionId AND ce.competitorId IN :competitorIds")
    List<CompetitorEntry> findCompetitorEntriesForPdfExtractionAndCompetitorIds(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("competitorIds") List<String> competitorIds);

    default List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceCodeWithCompetitor(
        final Integer pdfExtractionId, final String raceCode) {
        final List<RaceCompetitorAssociation> associations = findByPdfExtractionIdAndRaceCodeRaw(pdfExtractionId, raceCode);
        enrichWithCompetitorEntries(associations, pdfExtractionId);
        return associations;
    }

    default List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceCodesWithCompetitor(
        final Integer pdfExtractionId, final List<String> raceCodes) {
        if (raceCodes == null || raceCodes.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        final List<RaceCompetitorAssociation> associations = findByPdfExtractionIdAndRaceCodesRaw(pdfExtractionId, raceCodes);
        enrichWithCompetitorEntries(associations, pdfExtractionId);
        return associations;
    }

    default List<RaceCompetitorAssociation> findConflictingCompetitorsBetweenRaceCodes(
        final Integer pdfExtractionId, final String raceACode, final String raceBCode) {
        final List<RaceCompetitorAssociation> associations =
            findConflictingCompetitorsBetweenRacesRaw(pdfExtractionId, raceACode, raceBCode);
        enrichWithCompetitorEntries(associations, pdfExtractionId);
        return associations;
    }

    private void enrichWithCompetitorEntries(final List<RaceCompetitorAssociation> associations,
        final Integer pdfExtractionId) {
        if (associations.isEmpty()) {
            return;
        }
        final List<String> competitorIds = associations.stream()
            .map(RaceCompetitorAssociation::getCompetitorId)
            .filter(id -> id != null)
            .distinct()
            .toList();
        if (competitorIds.isEmpty()) {
            return;
        }
        final List<CompetitorEntry> entries =
            findCompetitorEntriesForPdfExtractionAndCompetitorIds(pdfExtractionId, competitorIds);
        final Map<String, CompetitorEntry> byCompetitorId = entries.stream()
            .collect(Collectors.toMap(
                CompetitorEntry::getCompetitorId,
                ce -> ce,
                (a, b) -> a));
        for (final RaceCompetitorAssociation rca : associations) {
            rca.setCompetitorEntry(byCompetitorId.get(rca.getCompetitorId()));
        }
    }
}
