package hu.szabolcst.idorendmaker.model.dto.rule;

import java.util.List;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
public class CreateRuleDataDto {

    private String name;
    private String description;
    private Integer minIntervalMinutes;
    private List<CreateRuleConditionDto> conditions;
    private List<CreateRuleMatchingDto> matchings;

    @Data
    public static class CreateRuleConditionDto {

        private String conditionSet;
        private String field;
        private String operator;
        private String value;

    }

    @Data
    public static class CreateRuleMatchingDto {

        private String field;

    }

}