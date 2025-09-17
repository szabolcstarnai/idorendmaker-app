package hu.szabolcst.idorendmaker.model.dto.matching;

import java.util.List;
import lombok.Data;

@Data
public class ExtractedRaceDto {

    private String id;
    private String name;
    private List<ExtractedCompetitorDto> competitors;
    private Integer matchedDatabaseRaceId;
    private Double matchConfidence;

}