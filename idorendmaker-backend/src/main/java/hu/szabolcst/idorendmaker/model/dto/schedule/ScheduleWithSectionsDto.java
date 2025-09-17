package hu.szabolcst.idorendmaker.model.dto.schedule;


import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import lombok.Setter;

@Data
public class ScheduleWithSectionsDto {

    private Integer id;
    private String name;
    private Integer pdfExtractionId;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime updatedAt;
    private List<ScheduleSectionWithItemsDto> sections;

}