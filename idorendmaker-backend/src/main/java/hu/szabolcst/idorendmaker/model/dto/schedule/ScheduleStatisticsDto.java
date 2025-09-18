package hu.szabolcst.idorendmaker.model.dto.schedule;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for schedule statistics
 * Contains summary information about a schedule without needing to load all schedule data
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleStatisticsDto {

    /**
     * Number of sections (days) in the schedule
     */
    private Integer totalSections;

    /**
     * Total number of race items in all sections
     */
    private Integer totalRaces;

    /**
     * Total duration of the schedule in minutes
     * Calculated from earliest start time to latest finish time across all sections
     */
    private Integer totalDurationMinutes;

    /**
     * Average races per section
     */
    private Double averageRacesPerSection;

    /**
     * Whether the schedule has PDF data linked
     */
    private Boolean hasPDFData;

    /**
     * Number of unique race types (base races without levels)
     */
    private Integer uniqueRaceTypes;

    /**
     * Most common interval between races in minutes
     */
    private Integer mostCommonInterval;
}