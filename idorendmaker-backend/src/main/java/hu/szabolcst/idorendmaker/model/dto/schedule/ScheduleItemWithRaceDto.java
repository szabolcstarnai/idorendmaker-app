package hu.szabolcst.idorendmaker.model.dto.schedule;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ScheduleItemWithRaceDto {

    private Integer id;
    private Integer scheduleId;
    private Integer sectionId;
    private String raceCode;
    private String levelCode;
    private String raceName;
    private String raceDiscipline;
    private String raceBoatClassName;
    private String raceGender;
    private String raceDistance;
    private String raceAgeGroupsDisplay;
    private String levelName;
    private String levelType;
    private Integer orderIndex;
    private Integer intervalMinutes;
    private String notes;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    private String calculatedStartTime;

}
