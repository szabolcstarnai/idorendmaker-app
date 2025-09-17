package hu.szabolcst.idorendmaker.model.dto.rule;

import lombok.Data;

@Data
public class RuleStatsDto {

    private Integer totalRules;
    private Integer activeRules;
    private Integer inactiveRules;

}