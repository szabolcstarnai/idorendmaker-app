package hu.szabolcst.idorendmaker.model.dto.matching;

import java.util.List;
import lombok.Data;

@Data
public class PDFProcessingResultDto {

    private Boolean success;
    private Integer pdfExtractionId;
    private List<ExtractedRaceDto> extractedRaces;
    private Integer totalCompetitors;
    private Integer totalEntries;
    private String error;
    private Boolean wasDeduplication;

}