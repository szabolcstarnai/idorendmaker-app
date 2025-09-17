package hu.szabolcst.idorendmaker.model.dto.matching;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class PDFExtractionStatsDto {

    private String filename;
    private Integer totalRaces;
    private Integer matchedRaces;
    private Integer totalCompetitors;
    private Integer totalEntries;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;

}