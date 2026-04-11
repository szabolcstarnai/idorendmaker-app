package hu.szabolcst.idorendmaker.model.dto.competitor;

import lombok.Data;

/**
 * DTO representing a race scheduled within a schedule, as consumed by the
 * competitor analysis endpoints. Mirrors the snapshot columns on
 * {@code ScheduleItem} so the frontend has display labels without
 * re-querying the catalog.
 */
@Data
public class ScheduleRaceDto {

    private String id;

    // Stable catalog codes (cross-datasource references)
    private String raceCode;
    private String levelCode;

    // Display snapshot fields (mirror schedule_items snapshot columns)
    private String raceName;
    private String raceDiscipline;
    private String raceBoatClassName;
    private String raceGender;
    private String raceDistance;
    private String raceAgeGroupsDisplay;
    private String levelName;
    private String levelType;

    private Integer day;
    private String startTime;
    private Integer order;

}
