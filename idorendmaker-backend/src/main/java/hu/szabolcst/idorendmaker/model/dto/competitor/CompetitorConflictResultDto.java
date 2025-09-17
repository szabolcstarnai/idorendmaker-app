package hu.szabolcst.idorendmaker.model.dto.competitor;

import java.util.List;
import lombok.Data;

@Data
public class CompetitorConflictResultDto {

    private Boolean hasConflicts;
    private List<String> conflictingCompetitors;
    private Integer competitorCount;

}
