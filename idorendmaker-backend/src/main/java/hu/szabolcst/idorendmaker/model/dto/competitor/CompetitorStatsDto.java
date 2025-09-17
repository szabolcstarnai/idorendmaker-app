package hu.szabolcst.idorendmaker.model.dto.competitor;

import lombok.Data;

@Data
public class CompetitorStatsDto {

    private Integer totalCompetitors;
    private Integer totalEntries;
    private Integer racesWithEntries;
    private Integer organizationsRepresented;

}