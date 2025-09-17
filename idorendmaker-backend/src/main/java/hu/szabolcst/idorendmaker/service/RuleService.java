package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.rule.CreateRuleDataDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleStatsDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleWithConditionsDto;
import java.util.List;
import java.util.Optional;

public interface RuleService {
  List<RuleWithConditionsDto> getAllRules();
  
  List<RuleWithConditionsDto> getActiveRules();
  
  Optional<RuleWithConditionsDto> getRuleById(Integer paramInteger);
  
  RuleWithConditionsDto createRule(CreateRuleDataDto paramCreateRuleDataDto);
  
  Optional<RuleWithConditionsDto> updateRule(Integer paramInteger, CreateRuleDataDto paramCreateRuleDataDto);
  
  boolean deleteRule(Integer paramInteger);
  
  boolean toggleRuleActive(Integer paramInteger, Boolean paramBoolean);
  
  RuleStatsDto getRuleStats();
  
  List<RuleWithConditionsDto> searchRules(String paramString);
  
  boolean dismissViolation(Integer paramInteger, String paramString);
  
  List<String> getDismissedViolations(Integer paramInteger);
  
  boolean undismissViolation(Integer paramInteger, String paramString);
  
  boolean clearDismissedViolations(Integer paramInteger);
  
  Integer getDismissedViolationCount(Integer paramInteger);
  
  boolean cleanupDismissedViolations(Integer paramInteger, List<String> paramList);
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\RuleService.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */