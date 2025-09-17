package hu.szabolcst.idorendmaker.model.dto.schedule;

import java.util.List;
import lombok.Data;

@Data
public class CreateScheduleSectionDataDto {

    private Integer scheduleId;
    private Integer dayNumber;
    private String sectionType;
    private String startTime;
    private List<CreateScheduleItemDataDto> items;

}