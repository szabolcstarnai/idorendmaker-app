package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RuleMapper;
import hu.szabolcst.idorendmaker.model.dto.rule.CreateRuleDataDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleStatsDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleWithConditionsDto;
import hu.szabolcst.idorendmaker.model.entity.DismissedRuleViolation;
import hu.szabolcst.idorendmaker.model.entity.Rule;
import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import hu.szabolcst.idorendmaker.repository.jdbc.DismissedRuleViolationJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RuleConditionJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RuleJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RuleMatchingJdbcRepository;
import hu.szabolcst.idorendmaker.service.RuleService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RuleServiceImpl implements RuleService {

    private final RuleJdbcRepository ruleRepository;
    private final RuleConditionJdbcRepository ruleConditionRepository;
    private final RuleMatchingJdbcRepository ruleMatchingRepository;
    private final DismissedRuleViolationJdbcRepository dismissedRuleViolationRepository;
    private final RuleMapper ruleMapper;


    private List<Rule> findAllRulesWithConditionsAndMatchings() {
        return this.ruleRepository.findAllWithConditionsAndMatchings();
    }


    private List<Rule> findActiveRulesWithConditionsAndMatchings() {
        return this.ruleRepository.findActiveWithConditionsAndMatchings();
    }


    private Optional<Rule> findRuleByIdWithConditionsAndMatchings(final Integer id) {
        return this.ruleRepository.findByIdWithConditionsAndMatchings(id);
    }


    private List<Rule> searchRulesWithConditionsAndMatchings(final String searchTerm) {
        return this.ruleRepository.searchWithConditionsAndMatchings(searchTerm);
    }


    @Transactional
    public List<RuleWithConditionsDto> getAllRules() {
        return this.ruleMapper.toRuleWithConditionsDtoList(findAllRulesWithConditionsAndMatchings());
    }


    @Transactional
    public List<RuleWithConditionsDto> getActiveRules() {
        return this.ruleMapper.toRuleWithConditionsDtoList(findActiveRulesWithConditionsAndMatchings());
    }


    @Transactional
    public Optional<RuleWithConditionsDto> getRuleById(final Integer id) {
        Objects.requireNonNull(this.ruleMapper);
        return findRuleByIdWithConditionsAndMatchings(id).map(this.ruleMapper::toRuleWithConditionsDto);
    }


    @Transactional
    public RuleWithConditionsDto createRule(final CreateRuleDataDto data) {
        final Rule rule = this.ruleRepository.save(this.ruleMapper.toRuleEntity(data));

        if (data.getConditions() != null && !data.getConditions().isEmpty()) {
            final List<RuleCondition> conditions = this.ruleMapper.toRuleConditionEntityList(data.getConditions(), rule.getId());
            this.ruleConditionRepository.saveAll(conditions);
        }

        if (data.getMatchings() != null && !data.getMatchings().isEmpty()) {
            final List<RuleMatching> matchings = this.ruleMapper.toRuleMatchingEntityList(data.getMatchings(), rule.getId());
            this.ruleMatchingRepository.saveAll(matchings);
        }

        final Rule savedRule = findRuleByIdWithConditionsAndMatchings(rule.getId()).orElseThrow();
        return this.ruleMapper.toRuleWithConditionsDto(savedRule);
    }


    @Transactional
    public Optional<RuleWithConditionsDto> updateRule(final Integer id, final CreateRuleDataDto data) {
        try {
            final Optional<Rule> existingRuleOpt = this.ruleRepository.findById(id);
            if (existingRuleOpt.isEmpty()) {
                return Optional.empty();
            }

            final Rule existingRule = existingRuleOpt.get();

            if (data.getName() != null) {
                existingRule.setName(data.getName());
            }
            if (data.getDescription() != null) {
                existingRule.setDescription(data.getDescription());
            }
            if (data.getMinIntervalMinutes() != null) {
                existingRule.setMinIntervalMinutes(data.getMinIntervalMinutes());
            }
            existingRule.setUpdatedAt(LocalDateTime.now());

            this.ruleRepository.save(existingRule);

            if (data.getConditions() != null) {

                this.ruleConditionRepository.deleteByRuleId(id);

                if (!data.getConditions().isEmpty()) {
                    final List<RuleCondition> conditions = this.ruleMapper.toRuleConditionEntityList(data.getConditions(), id);
                    this.ruleConditionRepository.saveAll(conditions);
                }
            }

            if (data.getMatchings() != null) {

                this.ruleMatchingRepository.deleteByRuleId(id);

                if (!data.getMatchings().isEmpty()) {
                    final List<RuleMatching> matchings = this.ruleMapper.toRuleMatchingEntityList(data.getMatchings(), id);
                    this.ruleMatchingRepository.saveAll(matchings);
                }
            }

            final Rule updatedRule = findRuleByIdWithConditionsAndMatchings(id).orElseThrow();
            return Optional.of(this.ruleMapper.toRuleWithConditionsDto(updatedRule));
        } catch (final Exception error) {
            log.error("Error updating rule", error);
            return Optional.empty();
        }
    }


    @Transactional
    public boolean deleteRule(final Integer id) {
        try {
            this.ruleRepository.deleteById(id);
            return true;
        } catch (final Exception error) {
            log.error("Error deleting rule", error);
            return false;
        }
    }


    @Transactional
    public boolean toggleRuleActive(final Integer id, final Boolean isActive) {
        try {
            final Optional<Rule> ruleOpt = this.ruleRepository.findById(id);
            if (ruleOpt.isEmpty()) {
                return false;
            }

            final Rule rule = ruleOpt.get();
            rule.setIsActive(isActive);
            rule.setUpdatedAt(LocalDateTime.now());
            this.ruleRepository.save(rule);
            return true;
        } catch (final Exception error) {
            log.error("Error toggling rule active status", error);
            return false;
        }
    }


    @Transactional
    public RuleStatsDto getRuleStats() {
        final long totalRules = this.ruleRepository.count();
        final long activeRules = this.ruleRepository.countByIsActiveTrue();
        final long inactiveRules = totalRules - activeRules;

        return this.ruleMapper.toRuleStatsDto((int) totalRules, (int) activeRules,
            (int) inactiveRules);
    }


    @Transactional
    public List<RuleWithConditionsDto> searchRules(final String searchTerm) {
        final List<Rule> rules = searchRulesWithConditionsAndMatchings(searchTerm);
        return this.ruleMapper.toRuleWithConditionsDtoList(rules);
    }


    @Transactional
    public boolean dismissViolation(final Integer scheduleId, final String violationHash) {
        try {
            final DismissedRuleViolation dismissedViolation = new DismissedRuleViolation();
            dismissedViolation.setScheduleId(scheduleId);
            dismissedViolation.setViolationHash(violationHash);

            this.dismissedRuleViolationRepository.save(dismissedViolation);
            return true;
        } catch (final Exception error) {
            log.error("Error dismissing violation", error);
            return false;
        }
    }


    @Transactional
    public List<String> getDismissedViolations(final Integer scheduleId) {
        try {
            return this.dismissedRuleViolationRepository.findViolationHashesByScheduleId(scheduleId);
        } catch (final Exception error) {
            log.error("Error getting dismissed violations", error);
            return List.of();
        }
    }


    @Transactional
    public boolean undismissViolation(final Integer scheduleId, final String violationHash) {
        try {
            final int deletedCount = this.dismissedRuleViolationRepository.deleteByScheduleIdAndViolationHash(scheduleId, violationHash);
            return (deletedCount > 0);
        } catch (final Exception error) {
            log.error("Error undismissing violation", error);
            return false;
        }
    }


    @Transactional
    public boolean clearDismissedViolations(final Integer scheduleId) {
        try {
            this.dismissedRuleViolationRepository.deleteByScheduleId(scheduleId);
            return true;
        } catch (final Exception error) {
            log.error("Error clearing dismissed violations", error);
            return false;
        }
    }


    @Transactional
    public Integer getDismissedViolationCount(final Integer scheduleId) {
        try {
            return (int) this.dismissedRuleViolationRepository.countByScheduleId(scheduleId);
        } catch (final Exception error) {
            log.error("Error getting dismissed violation count", error);
            return 0;
        }
    }


    @Transactional
    public boolean cleanupDismissedViolations(final Integer scheduleId, final List<String> currentViolationHashes) {
        try {
            if (currentViolationHashes.isEmpty()) {

                this.dismissedRuleViolationRepository.deleteByScheduleId(scheduleId);
            } else {

                this.dismissedRuleViolationRepository.deleteByScheduleIdAndViolationHashNotIn(scheduleId, currentViolationHashes);
            }
            return true;
        } catch (final Exception error) {
            log.error("Error cleaning up dismissed violations", error);
            return false;
        }
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\impl\RuleServiceImpl.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */