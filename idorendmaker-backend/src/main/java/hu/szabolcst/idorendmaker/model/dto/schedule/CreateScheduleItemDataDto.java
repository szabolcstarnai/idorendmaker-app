package hu.szabolcst.idorendmaker.model.dto.schedule;

import lombok.Data;

@Data
public class CreateScheduleItemDataDto {

    private Integer raceId;
    private Integer levelId;
    private Integer orderIndex;
    private Integer intervalMinutes;
    private String notes;

}