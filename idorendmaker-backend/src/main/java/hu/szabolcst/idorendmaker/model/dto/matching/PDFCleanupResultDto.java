package hu.szabolcst.idorendmaker.model.dto.matching;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class PDFCleanupResultDto {

    private Integer deletedExtractions;
    private Integer deletedRecords;

}