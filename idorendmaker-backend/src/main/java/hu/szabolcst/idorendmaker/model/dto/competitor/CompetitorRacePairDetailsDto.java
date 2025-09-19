package hu.szabolcst.idorendmaker.model.dto.competitor;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetitorRacePairDetailsDto {

    private Integer race1Id;
    private String levelType1;
    private Integer level1Id;
    private String race1Name;
    private String race1StartTime;

    private Integer race2Id;
    private String levelType2;
    private Integer level2Id;
    private String race2Name;
    private String race2StartTime;

    private Integer estimatedDuration;
    private Integer intervalToNext;
    private Integer recoveryTime;
    private String conflictLevel;

}