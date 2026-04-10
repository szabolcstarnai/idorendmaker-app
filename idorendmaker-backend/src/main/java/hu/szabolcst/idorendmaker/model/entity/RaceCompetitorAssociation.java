package hu.szabolcst.idorendmaker.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "race_competitor_associations")
public class RaceCompetitorAssociation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "pdf_extraction_id", nullable = false)
    private Integer pdfExtractionId;

    @Column(name = "race_id", nullable = false)
    private Integer raceId;

    @Column(name = "competitor_id", nullable = false)
    private String competitorId;

    @Column(name = "pdf_race_name", nullable = false)
    private String pdfRaceName;

    @Column(name = "match_confidence")
    private Float matchConfidence = 1.0F;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdf_extraction_id", insertable = false, updatable = false)
    private PDFExtraction pdfExtraction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id", insertable = false, updatable = false)
    private Race race;

    // Not a real FK: (pdf_extraction_id, competitor_id) is a composite text link,
    // not a numeric FK to competitor_entries.id. Populated manually by repository fetch queries.
    @Transient
    private CompetitorEntry competitorEntry;

    public RaceCompetitorAssociation() {
        this.createdAt = LocalDateTime.now();
    }
}
