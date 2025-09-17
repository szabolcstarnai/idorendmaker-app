package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ScheduleSection {

    private Integer id;
    private Integer scheduleId;
    private String sectionType;
    private String startTime;
    private Integer dayNumber = 1;
    private LocalDateTime createdAt;
    private Schedule schedule;
    private List<ScheduleItem> scheduleItems = new ArrayList<>();

    public ScheduleSection() {
        this.createdAt = LocalDateTime.now();
    }

}