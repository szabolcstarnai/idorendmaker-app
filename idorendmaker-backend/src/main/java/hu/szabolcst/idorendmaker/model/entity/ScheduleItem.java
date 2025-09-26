package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ScheduleItem {

    private Integer id;
    private Integer scheduleId;
    private Integer sectionId;
    private Integer raceId;
    private Integer levelId;
    private Integer orderIndex;
    private Integer intervalMinutes;
    private String notes;
    private LocalDateTime createdAt;
    private Schedule schedule;
    private ScheduleSection section;
    private Race race;
    private Level level;

    public ScheduleItem() {
        this.createdAt = LocalDateTime.now();
    }

}