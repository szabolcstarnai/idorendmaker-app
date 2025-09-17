package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class CompetitorEntry {

    private Integer id;
    private Integer pdfExtractionId;
    private String competitorId;
    private String competitorName;
    private String organization;
    private Integer birthYear;
    private LocalDateTime createdAt;
    private PDFExtraction pdfExtraction;
    private List<RaceCompetitorAssociation> raceCompetitorAssociations = new ArrayList<>();

    public CompetitorEntry() {
        this.createdAt = LocalDateTime.now();
    }
}