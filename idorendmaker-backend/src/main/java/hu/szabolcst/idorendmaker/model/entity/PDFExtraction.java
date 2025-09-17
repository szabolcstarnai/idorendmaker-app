package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class PDFExtraction {

    private Integer id;
    private String filename;
    private String fileHash;
    private Integer totalRaces = 0;
    private Integer totalCompetitors = 0;
    private Integer totalEntries = 0;
    private String extractionStatus = "session";
    private String status = "session";
    private LocalDateTime linkedAt;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private List<CompetitorEntry> competitorEntries = new ArrayList<>();
    private List<RaceCompetitorAssociation> raceCompetitorAssociations = new ArrayList<>();
    private List<Schedule> schedules = new ArrayList<>();

    public PDFExtraction() {
        this.createdAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return (this.expiresAt != null && LocalDateTime.now().isAfter(this.expiresAt));
    }

    public void markLinked() {
        this.extractionStatus = "linked";
        this.expiresAt = null;
    }
}