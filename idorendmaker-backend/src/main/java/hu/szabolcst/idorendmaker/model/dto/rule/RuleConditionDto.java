package hu.szabolcst.idorendmaker.model.dto.rule;

import lombok.Data;

@Data
public class RuleConditionDto {

    private Integer id;
    private Integer ruleId;
    private String conditionSet;
    private String field;
    private String operator;
    private String value;

}