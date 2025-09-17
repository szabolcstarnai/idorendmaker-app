package hu.szabolcst.idorendmaker.model.dto.schedule;

import lombok.Data;

@Data
public class ScheduleWithPDFContextDto {

    private ScheduleWithSectionsDto schedule;
    private Integer pdfExtractionId;
    private Boolean hasPDFData;

}