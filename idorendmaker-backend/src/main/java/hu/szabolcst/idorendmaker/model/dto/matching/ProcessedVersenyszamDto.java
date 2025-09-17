package hu.szabolcst.idorendmaker.model.dto.matching;

import java.util.List;
import lombok.Data;

@Data
public class ProcessedVersenyszamDto {

    private String nev;
    private String hajoosztaly;
    private String nem;
    private String korosztaly;
    private String tav;
    private List<ProcessedCompetitorDto> nevezettek;

    @Data
    public static class ProcessedCompetitorDto {

        private String id;
        private String nev;
        private String tagszervezet;
        private Integer szuletesiEv;

    }

}