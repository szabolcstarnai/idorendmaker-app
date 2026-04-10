package hu.szabolcst.idorendmaker.model.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "pdf_extractions")
public class PDFExtraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String filename;

    @Column(name = "file_hash")
    private String fileHash;

    @Column(name = "total_races")
    private Integer totalRaces = 0;

    @Column(name = "total_competitors")
    private Integer totalCompetitors = 0;

    @Column(name = "total_entries")
    private Integer totalEntries = 0;

    @Column(name = "extraction_status")
    private String extractionStatus = "session";

    @Column(name = "status")
    private String status = "session";

    @Column(name = "linked_at")
    private LocalDateTime linkedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @OneToMany(mappedBy = "pdfExtraction", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CompetitorEntry> competitorEntries = new ArrayList<>();

    @OneToMany(mappedBy = "pdfExtraction", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RaceCompetitorAssociation> raceCompetitorAssociations = new ArrayList<>();

    @OneToMany(mappedBy = "pdfExtraction", fetch = FetchType.LAZY)
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
