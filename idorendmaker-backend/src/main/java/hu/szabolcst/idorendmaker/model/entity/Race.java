package hu.szabolcst.idorendmaker.model.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "races")
public class Race {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false)
    private String discipline;

    @Column(name = "boat_class", nullable = false)
    private String boatClass;                // legacy text column

    @Column(name = "boat_class_id")
    private Integer boatClassId;

    @Column(nullable = false)
    private String gender;

    @Column(nullable = false)
    private String distance;

    @Column(nullable = false)
    private Integer occurrence = 0;

    @Column(nullable = false)
    private Boolean hidden = Boolean.FALSE;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "boat_class_id", insertable = false, updatable = false)
    private BoatClass boatClassData;

    @OneToMany(mappedBy = "race", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RaceAgeGroup> ageGroups = new ArrayList<>();

    @OneToMany(mappedBy = "race", fetch = FetchType.LAZY)
    private List<ScheduleItem> scheduleItems = new ArrayList<>();

    @OneToMany(mappedBy = "race", fetch = FetchType.LAZY)
    private List<RaceCompetitorAssociation> raceCompetitorAssociations = new ArrayList<>();

    public Race() {
        final LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PrePersist
    void prePersist() {
        final LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void markUpdated() {
        this.updatedAt = LocalDateTime.now();
    }
}
