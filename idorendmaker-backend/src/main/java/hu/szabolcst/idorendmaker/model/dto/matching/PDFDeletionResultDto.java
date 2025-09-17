package hu.szabolcst.idorendmaker.model.dto.matching;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class PDFDeletionResultDto {

    private Boolean success;
    private String error;

}