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

    @Column(name = "race_id", nullable = false)
    private Integer raceId;

    @Column(name = "level_id")
    private Integer levelId;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id", insertable = false, updatable = false)
    private Race race;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "level_id", insertable = false, updatable = false)
    private Level level;

    public ScheduleItem() {
        this.createdAt = LocalDateTime.now();
    }

}
