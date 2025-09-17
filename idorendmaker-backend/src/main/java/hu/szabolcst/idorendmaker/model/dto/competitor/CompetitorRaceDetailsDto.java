package hu.szabolcst.idorendmaker.model.dto.competitor;

import lombok.Data;

@Data
public class CompetitorRaceDetailsDto {

    private Integer raceId;
    private String raceName;
    private String scheduledTime;
    private Integer estimatedDuration;
    private Integer intervalToNext;
    private Integer recoveryTime;
    private String conflictLevel;

}