package hu.szabolcst.idorendmaker.model.dto.schedule;


import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import lombok.Setter;

@Data
public class ScheduleSectionWithItemsDto {

    private Integer id;
    private Integer scheduleId;
    private Integer dayNumber;
    private String sectionType;
    private String startTime;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    private List<ScheduleItemWithRaceDto> items;

}