package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class RaceCompetitorAssociation {

    private Integer id;
    private Integer pdfExtractionId;
    private Integer raceId;
    private String competitorId;
    private String pdfRaceName;
    private Float matchConfidence = 1.0F;
    private LocalDateTime createdAt;
    private PDFExtraction pdfExtraction;
    private Race race;
    private CompetitorEntry competitorEntry;

    public RaceCompetitorAssociation() {
        this.createdAt = LocalDateTime.now();
    }

}