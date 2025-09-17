package hu.szabolcst.idorendmaker.model.entity;

import lombok.Data;

@Data
public class RuleCondition {

    private Integer id;
    private Integer ruleId;
    private String conditionSet;
    private String field;
    private String operator;
    private String value;
    private Rule rule;

}