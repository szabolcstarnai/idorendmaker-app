package hu.szabolcst.idorendmaker.model.dto.competitor;


import java.util.List;
import lombok.Data;

@Data
public class RaceCompetitorSummaryDto {

    private Integer entryCount;
    private List<String> topCompetitors;
    private List<String> organizations;

}