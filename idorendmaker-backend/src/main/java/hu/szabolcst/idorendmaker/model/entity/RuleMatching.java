package hu.szabolcst.idorendmaker.model.entity;

import lombok.Data;

@Data
public class RuleMatching {

    private Integer id;
    private Integer ruleId;
    private String field;
    private Rule rule;

}