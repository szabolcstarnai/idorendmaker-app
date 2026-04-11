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

    private String race1Code;
    private String levelType1;
    private String level1Code;
    private String race1Name;
    private String race1StartTime;

    private String race2Code;
    private String levelType2;
    private String level2Code;
    private String race2Name;
    private String race2StartTime;

    private Integer estimatedDuration;
    private Integer intervalToNext;
    private Integer recoveryTime;
    private String conflictLevel;

}
