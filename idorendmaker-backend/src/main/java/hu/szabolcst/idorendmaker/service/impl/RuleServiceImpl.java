package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RuleMapper;
import hu.szabolcst.idorendmaker.model.dto.rule.CreateRuleDataDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleStatsDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleWithConditionsDto;
import hu.szabolcst.idorendmaker.model.entity.DismissedRuleViolation;
import hu.szabolcst.idorendmaker.model.entity.Rule;
import hu.szabolcst.idorendmaker.model.entity.RuleCondition;
import hu.szabolcst.idorendmaker.model.entity.RuleMatching;
import hu.szabolcst.idorendmaker.repository.DismissedRuleViolationRepository;
import hu.szabolcst.idorendmaker.repository.RuleConditionRepository;
import hu.szabolcst.idorendmaker.repository.RuleMatchingRepository;
import hu.szabolcst.idorendmaker.repository.RuleRepository;
import hu.szabolcst.idorendmaker.service.RuleService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RuleServiceImpl implements RuleService {

    private final RuleRepository ruleRepository;
    private final RuleConditionRepository ruleConditionRepository;
    private final RuleMatchingRepository ruleMatchingRepository;
    private final DismissedRuleViolationRepository dismissedRuleViolationRepository;
    private final RuleMapper ruleMapper;

    private List<Rule> findAllRulesWithConditionsAndMatchings() {
        return ruleRepository.findAllWithConditionsAndMatchings();
    }

    private List<Rule> findActiveRulesWithConditionsAndMatchings() {
        return ruleRepository.findActiveWithConditionsAndMatchings();
    }

    private Optional<Rule> findRuleByIdWithConditionsAndMatchings(final Integer id) {
        return ruleRepository.findByIdWithConditionsAndMatchings(id);
    }

    private List<Rule> searchRulesWithConditionsAndMatchings(final String searchTerm) {
        return ruleRepository.searchWithConditionsAndMatchings(searchTerm);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RuleWithConditionsDto> getAllRules() {
        return ruleMapper.toRuleWithConditionsDtoList(findAllRulesWithConditionsAndMatchings());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RuleWithConditionsDto> getActiveRules() {
        return ruleMapper.toRuleWithConditionsDtoList(findActiveRulesWithConditionsAndMatchings());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RuleWithConditionsDto> getRuleById(final Integer id) {
        return findRuleByIdWithConditionsAndMatchings(id).map(ruleMapper::toRuleWithConditionsDto);
    }

    @Override
    @Transactional
    public RuleWithConditionsDto createRule(final CreateRuleDataDto data) {
        // Create the rule entity
        final Rule rule = ruleRepository.save(ruleMapper.toRuleEntity(data));

        // Create conditions
        if (data.getConditions() != null && !data.getConditions().isEmpty()) {
            final List<RuleCondition> conditions = ruleMapper.toRuleConditionEntityList(data.getConditions(), rule.getId());
            ruleConditionRepository.saveAll(conditions);
        }

        // Create matchings
        if (data.getMatchings() != null && !data.getMatchings().isEmpty()) {
            final List<RuleMatching> matchings = ruleMapper.toRuleMatchingEntityList(data.getMatchings(), rule.getId());
            ruleMatchingRepository.saveAll(matchings);
        }

        // Fetch and return the complete rule with relationships
        final Rule savedRule = findRuleByIdWithConditionsAndMatchings(rule.getId()).orElseThrow();
        return ruleMapper.toRuleWithConditionsDto(savedRule);
    }

    @Override
    @Transactional
    public Optional<RuleWithConditionsDto> updateRule(final Integer id, final CreateRuleDataDto data) {
        try {
            // Check if rule exists
            final Optional<Rule> existingRuleOpt = ruleRepository.findById(id);
            if (existingRuleOpt.isEmpty()) {
                return Optional.empty();
            }

            final Rule existingRule = existingRuleOpt.get();

            // Update basic rule fields
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

            ruleRepository.save(existingRule);

            // Update conditions if provided
            if (data.getConditions() != null) {
                // Delete existing conditions
                ruleConditionRepository.deleteByRuleId(id);

                // Create new conditions
                if (!data.getConditions().isEmpty()) {
                    final List<RuleCondition> conditions = ruleMapper.toRuleConditionEntityList(data.getConditions(), id);
                    ruleConditionRepository.saveAll(conditions);
                }
            }

            // Update matchings if provided
            if (data.getMatchings() != null) {
                // Delete existing matchings
                ruleMatchingRepository.deleteByRuleId(id);

                // Create new matchings
                if (!data.getMatchings().isEmpty()) {
                    final List<RuleMatching> matchings = ruleMapper.toRuleMatchingEntityList(data.getMatchings(), id);
                    ruleMatchingRepository.saveAll(matchings);
                }
            }

            // Fetch and return the updated rule with relationships
            final Rule updatedRule = findRuleByIdWithConditionsAndMatchings(id).orElseThrow();
            return Optional.of(ruleMapper.toRuleWithConditionsDto(updatedRule));

        } catch (final Exception error) {
            log.error("Error updating rule", error);
            return Optional.empty();
        }
    }

    @Override
    @Transactional
    public boolean deleteRule(final Integer id) {
        try {
            ruleRepository.deleteById(id);
            return true;
        } catch (final Exception error) {
            log.error("Error deleting rule", error);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean toggleRuleActive(final Integer id, final Boolean isActive) {
        try {
            final Optional<Rule> ruleOpt = ruleRepository.findById(id);
            if (ruleOpt.isEmpty()) {
                return false;
            }

            final Rule rule = ruleOpt.get();
            rule.setIsActive(isActive);
            rule.setUpdatedAt(LocalDateTime.now());
            ruleRepository.save(rule);
            return true;
        } catch (final Exception error) {
            log.error("Error toggling rule active status", error);
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public RuleStatsDto getRuleStats() {
        final long totalRules = ruleRepository.count();
        final long activeRules = ruleRepository.countByIsActiveTrue();
        final long inactiveRules = totalRules - activeRules;

        return ruleMapper.toRuleStatsDto((int) totalRules, (int) activeRules, (int) inactiveRules);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RuleWithConditionsDto> searchRules(final String searchTerm) {
        final List<Rule> rules = searchRulesWithConditionsAndMatchings(searchTerm);
        return ruleMapper.toRuleWithConditionsDtoList(rules);
    }

    @Override
    @Transactional
    public boolean dismissViolation(final Integer scheduleId, final String violationHash) {
        try {
            final DismissedRuleViolation dismissedViolation = new DismissedRuleViolation();
            dismissedViolation.setScheduleId(scheduleId);
            dismissedViolation.setViolationHash(violationHash);
            
            dismissedRuleViolationRepository.save(dismissedViolation);
            return true;
        } catch (final Exception error) {
            log.error("Error dismissing violation", error);
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getDismissedViolations(final Integer scheduleId) {
        try {
            return dismissedRuleViolationRepository.findViolationHashesByScheduleId(scheduleId);
        } catch (final Exception error) {
            log.error("Error getting dismissed violations", error);
            return List.of();
        }
    }

    @Override
    @Transactional
    public boolean undismissViolation(final Integer scheduleId, final String violationHash) {
        try {
            final int deletedCount = dismissedRuleViolationRepository.deleteByScheduleIdAndViolationHash(scheduleId, violationHash);
            return deletedCount > 0;
        } catch (final Exception error) {
            log.error("Error undismissing violation", error);
            return false;
        }
    }

    @Override
    @Transactional
    public boolean clearDismissedViolations(final Integer scheduleId) {
        try {
            dismissedRuleViolationRepository.deleteByScheduleId(scheduleId);
            return true;
        } catch (final Exception error) {
            log.error("Error clearing dismissed violations", error);
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Integer getDismissedViolationCount(final Integer scheduleId) {
        try {
            return (int) dismissedRuleViolationRepository.countByScheduleId(scheduleId);
        } catch (final Exception error) {
            log.error("Error getting dismissed violation count", error);
            return 0;
        }
    }

    @Override
    @Transactional
    public boolean cleanupDismissedViolations(final Integer scheduleId, final List<String> currentViolationHashes) {
        try {
            if (currentViolationHashes.isEmpty()) {
                // If no current violations, clear all dismissed violations for this schedule
                dismissedRuleViolationRepository.deleteByScheduleId(scheduleId);
            } else {
                // Remove dismissed violations that are no longer in current violations
                dismissedRuleViolationRepository.deleteByScheduleIdAndViolationHashNotIn(scheduleId, currentViolationHashes);
            }
            return true;
        } catch (final Exception error) {
            log.error("Error cleaning up dismissed violations", error);
            return false;
        }
    }

}
