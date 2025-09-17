package hu.szabolcst.idorendmaker.model.dto.schedule;

import com.fasterxml.jackson.annotation.JsonFormat;
import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.Setter;

@Data
public class ScheduleItemWithRaceAndSectionDto {

    private Integer id;
    private Integer scheduleId;
    private Integer sectionId;
    private Integer raceId;
    private Integer levelId;
    private Integer orderIndex;
    private Integer intervalMinutes;
    private String notes;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    private RaceWithAgeGroupsDto race;
    private LevelDto level;
    private ScheduleSectionDto section;
    private String calculatedStartTime;

}