package hu.szabolcst.idorendmaker.model.dto.competitor;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import lombok.Data;

@Data
public class ScheduleRaceDto {

    private String id;
    private RaceWithAgeGroupsAndBoatClassDto race;
    private LevelDto level;
    private Integer day;
    private String startTime;
    private Integer order;

}