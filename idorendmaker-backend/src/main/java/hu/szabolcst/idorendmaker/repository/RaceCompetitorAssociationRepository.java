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

    @Query("SELECT DISTINCT rca.raceId FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId")
    List<Integer> findDistinctRaceIdsByPdfExtractionId(@Param("pdfExtractionId") Integer pdfExtractionId);

    List<RaceCompetitorAssociation> findAllByPdfExtractionId(Integer pdfExtractionId);

    @Query("SELECT rca FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId AND rca.raceId = :raceId "
        + "ORDER BY rca.id")
    List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceIdRaw(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("raceId") Integer raceId);

    @Query("SELECT rca FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId AND rca.raceId IN :raceIds "
        + "ORDER BY rca.raceId, rca.id")
    List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceIdsRaw(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("raceIds") List<Integer> raceIds);

    @Query("SELECT rca FROM RaceCompetitorAssociation rca "
        + "WHERE rca.pdfExtractionId = :pdfExtractionId "
        + "AND rca.raceId = :raceAId "
        + "AND rca.competitorId IN ("
        + "    SELECT rca2.competitorId FROM RaceCompetitorAssociation rca2 "
        + "    WHERE rca2.pdfExtractionId = :pdfExtractionId AND rca2.raceId = :raceBId"
        + ") ORDER BY rca.id")
    List<RaceCompetitorAssociation> findConflictingCompetitorsBetweenRacesRaw(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("raceAId") Integer raceAId,
        @Param("raceBId") Integer raceBId);

    @Query("SELECT ce FROM CompetitorEntry ce "
        + "WHERE ce.pdfExtractionId = :pdfExtractionId AND ce.competitorId IN :competitorIds")
    List<CompetitorEntry> findCompetitorEntriesForPdfExtractionAndCompetitorIds(
        @Param("pdfExtractionId") Integer pdfExtractionId,
        @Param("competitorIds") List<String> competitorIds);

    default List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceIdWithCompetitor(
        final Integer pdfExtractionId, final Integer raceId) {
        final List<RaceCompetitorAssociation> associations = findByPdfExtractionIdAndRaceIdRaw(pdfExtractionId, raceId);
        enrichWithCompetitorEntries(associations, pdfExtractionId);
        return associations;
    }

    default List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceIdsWithCompetitor(
        final Integer pdfExtractionId, final List<Integer> raceIds) {
        if (raceIds == null || raceIds.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        final List<RaceCompetitorAssociation> associations = findByPdfExtractionIdAndRaceIdsRaw(pdfExtractionId, raceIds);
        enrichWithCompetitorEntries(associations, pdfExtractionId);
        return associations;
    }

    default List<RaceCompetitorAssociation> findConflictingCompetitorsBetweenRaces(
        final Integer pdfExtractionId, final Integer raceAId, final Integer raceBId) {
        final List<RaceCompetitorAssociation> associations =
            findConflictingCompetitorsBetweenRacesRaw(pdfExtractionId, raceAId, raceBId);
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
