package hu.szabolcst.idorendmaker.model.dto.rule;

import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import lombok.Data;

@Data
public class RuleViolationDto {

    private RuleWithConditionsDto rule;
    private RaceWithAgeGroupsDto race1;
    private RaceWithAgeGroupsDto race2;
    private Integer actualIntervalMinutes;
    private Integer requiredIntervalMinutes;
    private String message;
    private String severity;
    private String violationHash;

}