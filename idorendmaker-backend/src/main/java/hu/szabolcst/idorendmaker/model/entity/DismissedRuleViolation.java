package hu.szabolcst.idorendmaker.model.entity;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class DismissedRuleViolation {

    private Integer id;
    private Integer scheduleId;
    private String violationHash;
    private LocalDateTime dismissedAt = LocalDateTime.now();
    private Schedule schedule;

}