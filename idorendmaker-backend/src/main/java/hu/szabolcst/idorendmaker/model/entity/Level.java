package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class Level {

    private Integer id;
    private String name;
    private String levelType;
    private Integer sortOrder = 0;
    private Boolean isDefault = Boolean.FALSE;
    private LocalDateTime createdAt;
    private List<ScheduleItem> scheduleItems = new ArrayList<>();

    public Level() {
        this.createdAt = LocalDateTime.now();
    }

}