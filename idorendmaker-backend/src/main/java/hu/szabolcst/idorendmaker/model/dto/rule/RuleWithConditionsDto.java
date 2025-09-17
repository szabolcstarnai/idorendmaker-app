package hu.szabolcst.idorendmaker.model.dto.rule;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import lombok.Setter;

@Data
public class RuleWithConditionsDto {

    private Integer id;
    private String name;
    private String description;
    private Integer minIntervalMinutes;
    private Boolean isActive;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime updatedAt;
    private List<RuleConditionDto> conditions;
    private List<RuleMatchingDto> matchings;

}