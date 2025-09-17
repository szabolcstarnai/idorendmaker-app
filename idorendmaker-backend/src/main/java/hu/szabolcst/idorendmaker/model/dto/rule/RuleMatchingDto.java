package hu.szabolcst.idorendmaker.model.dto.rule;

import lombok.Data;

@Data
public class RuleMatchingDto {

    private Integer id;
    private Integer ruleId;
    private String field;

}