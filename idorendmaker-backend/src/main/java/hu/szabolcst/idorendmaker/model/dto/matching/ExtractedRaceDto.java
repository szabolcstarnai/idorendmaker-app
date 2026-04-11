package hu.szabolcst.idorendmaker.model.dto.matching;

import java.util.List;
import lombok.Data;

@Data
public class ExtractedRaceDto {

    private String id;
    private String name;
    private List<ExtractedCompetitorDto> competitors;
    /**
     * Stable catalog code of the race this extraction row was matched against,
     * or {@code null} if no match was found. A non-null value means the PDF
     * row was successfully resolved to a live catalog entry.
     */
    private String matchedDatabaseRaceCode;
    private Double matchConfidence;

}
