package hu.szabolcst.idorendmaker.model.dto.matching;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractedCompetitorDto {

    private String id;
    private String name;
    private String organization;
    private Integer birthYear;
    private List<String> raceEntries;

}