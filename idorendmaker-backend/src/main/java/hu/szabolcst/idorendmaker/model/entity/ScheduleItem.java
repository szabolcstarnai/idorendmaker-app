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
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "schedule_items")
public class ScheduleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "schedule_id", nullable = false)
    private Integer scheduleId;

    @Column(name = "section_id")
    private Integer sectionId;

    @Column(name = "race_code", nullable = false)
    private String raceCode;

    @Column(name = "level_code")
    private String levelCode;

    @Column(name = "race_name", nullable = false)
    private String raceName;

    @Column(name = "race_discipline", nullable = false)
    private String raceDiscipline;

    @Column(name = "race_boat_class_name", nullable = false)
    private String raceBoatClassName;

    @Column(name = "race_gender", nullable = false)
    private String raceGender;

    @Column(name = "race_distance", nullable = false)
    private String raceDistance;

    @Column(name = "race_age_groups_display")
    private String raceAgeGroupsDisplay;

    @Column(name = "level_name")
    private String levelName;

    @Column(name = "level_type")
    private String levelType;

    @Column(name = "order_index")
    private Integer orderIndex;

    @Column(name = "interval_minutes")
    private Integer intervalMinutes;

    @Column
    private String notes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_id", insertable = false, updatable = false)
    private Schedule schedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", insertable = false, updatable = false)
    private ScheduleSection section;

    public ScheduleItem() {
        this.createdAt = LocalDateTime.now();
    }

}
