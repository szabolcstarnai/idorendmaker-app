package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.rule.CreateRuleDataDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleConditionDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleMatchingDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleStatsDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleWithConditionsDto;
import hu.szabolcst.idorendmaker.model.entity.Rule;
import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Mappings;


@Mapper
public interface RuleMapper {

    default RuleStatsDto toRuleStatsDto(final Integer totalRules, final Integer activeRules, final Integer inactiveRules) {
        final RuleStatsDto dto = new RuleStatsDto();
        dto.setTotalRules(totalRules);
        dto.setActiveRules(activeRules);
        dto.setInactiveRules(inactiveRules);
        return dto;
    }

    default Rule toRuleEntity(final CreateRuleDataDto createRuleDataDto) {
        final Rule rule = new Rule();
        rule.setName(createRuleDataDto.getName());
        rule.setDescription(createRuleDataDto.getDescription());
        rule.setMinIntervalMinutes(createRuleDataDto.getMinIntervalMinutes());
        return rule;
    }

    default RuleCondition toRuleConditionEntity(final CreateRuleDataDto.CreateRuleConditionDto conditionDto, final Integer ruleId) {
        final RuleCondition condition = new RuleCondition();
        condition.setRuleId(ruleId);
        condition.setConditionSet(conditionDto.getConditionSet());
        condition.setField(conditionDto.getField());
        condition.setOperator(conditionDto.getOperator());
        condition.setValue(conditionDto.getValue());
        return condition;
    }

    default RuleMatching toRuleMatchingEntity(final CreateRuleDataDto.CreateRuleMatchingDto matchingDto, final Integer ruleId) {
        final RuleMatching matching = new RuleMatching();
        matching.setRuleId(ruleId);
        matching.setField(matchingDto.getField());
        return matching;
    }

    default List<RuleCondition> toRuleConditionEntityList(final List<CreateRuleDataDto.CreateRuleConditionDto> conditionDtos,
        final Integer ruleId) {
        if (conditionDtos == null) {
            return List.of();
        }
        return conditionDtos.stream()
            .map(conditionDto -> toRuleConditionEntity(conditionDto, ruleId))
            .toList();
    }

    default List<RuleMatching> toRuleMatchingEntityList(final List<CreateRuleDataDto.CreateRuleMatchingDto> matchingDtos,
        final Integer ruleId) {
        if (matchingDtos == null) {
            return List.of();
        }
        return matchingDtos.stream()
            .map(matchingDto -> toRuleMatchingEntity(matchingDto, ruleId))
            .toList();
    }

    @Mappings({@Mapping(target = "conditions", source = "conditions"), @Mapping(target = "matchings", source = "matchings")})
    RuleWithConditionsDto toRuleWithConditionsDto(Rule paramRule);

    RuleConditionDto toRuleConditionDto(RuleCondition paramRuleCondition);

    RuleMatchingDto toRuleMatchingDto(RuleMatching paramRuleMatching);

    List<RuleConditionDto> toRuleConditionDtoList(List<RuleCondition> paramList);

    List<RuleMatchingDto> toRuleMatchingDtoList(List<RuleMatching> paramList);

    List<RuleWithConditionsDto> toRuleWithConditionsDtoList(List<Rule> paramList);

}