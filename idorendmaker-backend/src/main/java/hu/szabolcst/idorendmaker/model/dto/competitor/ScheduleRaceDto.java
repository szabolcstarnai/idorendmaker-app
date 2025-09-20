package hu.szabolcst.idorendmaker.model.dto.competitor;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import lombok.Data;

@Data
public class ScheduleRaceDto {

    private String id;
    private RaceWithAgeGroupsDto race;
    private LevelDto level;
    private Integer day;
    private String startTime;
    private Integer order;

}