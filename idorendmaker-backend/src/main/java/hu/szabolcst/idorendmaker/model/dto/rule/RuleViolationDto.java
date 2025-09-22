package hu.szabolcst.idorendmaker.model.dto.rule;

import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import lombok.Data;

@Data
public class RuleViolationDto {

    private RuleWithConditionsDto rule;
    private RaceWithAgeGroupsAndBoatClassDto race1;
    private RaceWithAgeGroupsAndBoatClassDto race2;
    private Integer actualIntervalMinutes;
    private Integer requiredIntervalMinutes;
    private String message;
    private String severity;
    private String violationHash;

}