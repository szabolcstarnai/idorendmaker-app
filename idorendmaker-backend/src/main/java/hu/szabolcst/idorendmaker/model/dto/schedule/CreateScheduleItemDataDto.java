package hu.szabolcst.idorendmaker.model.dto.schedule;

import lombok.Data;

@Data
public class CreateScheduleItemDataDto {

    private String raceCode;
    private String levelCode;
    private Integer orderIndex;
    private Integer intervalMinutes;
    private String notes;

}
