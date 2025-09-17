package hu.szabolcst.idorendmaker.model.dto.matching;

import hu.szabolcst.idorendmaker.model.dto.competitor.CompetitorRaceInfoDto;
import java.util.List;
import lombok.Data;

@Data
public class CompetitorDataDto {

    private String id;
    private String name;
    private String organization;
    private Integer birthYear;
    private List<CompetitorRaceInfoDto> races;

}