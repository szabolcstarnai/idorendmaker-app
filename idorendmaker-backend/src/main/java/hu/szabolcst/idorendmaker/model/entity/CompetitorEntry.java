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
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "competitor_entries")
public class CompetitorEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "pdf_extraction_id", nullable = false)
    private Integer pdfExtractionId;

    @Column(name = "competitor_id", nullable = false)
    private String competitorId;

    @Column(name = "competitor_name", nullable = false)
    private String competitorName;

    @Column
    private String organization;

    @Column(name = "birth_year")
    private Integer birthYear;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdf_extraction_id", insertable = false, updatable = false)
    private PDFExtraction pdfExtraction;

    // Not a real FK in the DB: competitor_id is TEXT and only unique within pdf_extraction_id.
    // Populated manually by repository fetch queries.
    @Transient
    private List<RaceCompetitorAssociation> raceCompetitorAssociations = new ArrayList<>();

    public CompetitorEntry() {
        this.createdAt = LocalDateTime.now();
    }
}
