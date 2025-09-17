package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.RaceCompetitorAssociation;
import java.util.List;

public interface RaceCompetitorAssociationRepository {

    List<RaceCompetitorAssociation> findByPdfExtractionIdAndRaceIdWithCompetitor(Integer paramInteger1, Integer paramInteger2);

    long countByPdfExtractionId(Integer paramInteger);

    List<Integer> findDistinctRaceIdsByPdfExtractionId(Integer paramInteger);

    List<RaceCompetitorAssociation> findConflictingCompetitorsBetweenRaces(Integer paramInteger1, Integer paramInteger2,
        Integer paramInteger3);

    List<RaceCompetitorAssociation> findAllByPdfExtractionId(Integer paramInteger);
}