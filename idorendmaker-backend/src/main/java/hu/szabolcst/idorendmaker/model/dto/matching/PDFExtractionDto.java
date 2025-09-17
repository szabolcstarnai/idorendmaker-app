package hu.szabolcst.idorendmaker.model.dto.matching;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class PDFExtractionDto {

    private Integer id;
    private String filename;
    private String fileHash;
    private Integer totalRaces;
    private Integer totalCompetitors;
    private Integer totalEntries;
    private String extractionStatus;
    private String status;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime linkedAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime expiresAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    private List<String> linkedSchedules;
    private Integer competitorEntriesCount;
    private Integer raceAssociationsCount;
    private Integer schedulesUsingCount;
    private Boolean canDelete;

}