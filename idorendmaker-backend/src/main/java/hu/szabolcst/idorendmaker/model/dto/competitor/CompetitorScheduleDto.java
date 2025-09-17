package hu.szabolcst.idorendmaker.model.dto.competitor;

import java.util.List;
import lombok.Data;

@Data
public class CompetitorScheduleDto {

    private String competitorId;
    private String competitorName;
    private String organization;
    private Integer birthYear;
    private List<CompetitorRaceDetailsDto> races;
    private Integer totalRaces;
    private Integer shortestInterval;
    private Integer longestInterval;
    private String riskLevel;

}