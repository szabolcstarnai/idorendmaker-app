package hu.szabolcst.idorendmaker.repository;

import hu.szabolcst.idorendmaker.model.entity.CompetitorEntry;
import java.util.List;

public interface CompetitorEntryRepository {

    List<CompetitorEntry> findAllWithRaceAssociationsByPdfExtractionId(Integer paramInteger);

    long countByPdfExtractionId(Integer paramInteger);

    List<String> findDistinctOrganizationsByPdfExtractionId(Integer paramInteger);

    List<CompetitorEntry> findAllByPdfExtractionId(Integer paramInteger);

    CompetitorEntry save(CompetitorEntry entity);

    void deleteAll(Iterable<? extends CompetitorEntry> entities);
}