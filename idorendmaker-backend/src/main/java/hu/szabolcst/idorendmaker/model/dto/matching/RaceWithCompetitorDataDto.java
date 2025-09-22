package hu.szabolcst.idorendmaker.model.dto.matching;

import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import java.util.List;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RaceWithCompetitorDataDto extends RaceWithAgeGroupsAndBoatClassDto {

    private Integer entryCount;
    private List<String> competitorIds;
    private List<String> topCompetitors;
    private Integer pdfExtractionId;

}