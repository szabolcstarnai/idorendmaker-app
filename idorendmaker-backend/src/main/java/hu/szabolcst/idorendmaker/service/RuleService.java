package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.rule.CreateRuleDataDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleStatsDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleWithConditionsDto;
import java.util.List;
import java.util.Optional;

/**
 * Service interface for Rule operations
 * Provides all functionality matching the TypeScript RuleService
 */
public interface RuleService {

    /**
     * Get all rules with their conditions and matchings
     * Equivalent to TypeScript: getAllRules(): Promise<RuleWithConditions[]>
     * Equivalent to IPC: 'db:getAllRules'
     */
    List<RuleWithConditionsDto> getAllRules();

    /**
     * Get all active rules only
     * Equivalent to TypeScript: getActiveRules(): Promise<RuleWithConditions[]>
     * Equivalent to IPC: 'db:getActiveRules'
     */
    List<RuleWithConditionsDto> getActiveRules();

    /**
     * Get a specific rule by ID with its conditions and matchings
     * Equivalent to TypeScript: getRuleById(id: number): Promise<RuleWithConditions | null>
     * Equivalent to IPC: 'db:getRuleById'
     */
    Optional<RuleWithConditionsDto> getRuleById(Integer id);

    /**
     * Create a new rule with conditions and matchings
     * Equivalent to TypeScript: createRule(data: CreateRuleData): Promise<RuleWithConditions>
     * Equivalent to IPC: 'db:createRule'
     */
    RuleWithConditionsDto createRule(CreateRuleDataDto data);

    /**
     * Update an existing rule
     * Equivalent to TypeScript: updateRule(id: number, data: Partial<CreateRuleData>): Promise<RuleWithConditions | null>
     * Equivalent to IPC: 'db:updateRule'
     */
    Optional<RuleWithConditionsDto> updateRule(Integer id, CreateRuleDataDto data);

    /**
     * Delete a rule
     * Equivalent to TypeScript: deleteRule(id: number): Promise<boolean>
     * Equivalent to IPC: 'db:deleteRule'
     */
    boolean deleteRule(Integer id);

    /**
     * Toggle rule active status
     * Equivalent to TypeScript: toggleRuleActive(id: number, isActive: boolean): Promise<boolean>
     * Equivalent to IPC: 'db:toggleRuleActive'
     */
    boolean toggleRuleActive(Integer id, Boolean isActive);

    /**
     * Get rule statistics
     * Equivalent to TypeScript: getRuleStats(): Promise<{totalRules: number, activeRules: number, inactiveRules: number}>
     * Equivalent to IPC: 'db:getRuleStats'
     */
    RuleStatsDto getRuleStats();

    /**
     * Search rules by name or description
     * Equivalent to TypeScript: searchRules(searchTerm: string): Promise<RuleWithConditions[]>
     * Equivalent to IPC: 'db:searchRules'
     */
    List<RuleWithConditionsDto> searchRules(String searchTerm);

    /**
     * Dismiss a rule violation for a specific schedule
     * Equivalent to TypeScript: dismissViolation(scheduleId: number, violationHash: string): Promise<boolean>
     * Equivalent to IPC: 'db:dismissViolation'
     */
    boolean dismissViolation(Integer scheduleId, String violationHash);

    /**
     * Get all dismissed violations for a schedule
     * Equivalent to TypeScript: getDismissedViolations(scheduleId: number): Promise<string[]>
     * Equivalent to IPC: 'db:getDismissedViolations'
     */
    List<String> getDismissedViolations(Integer scheduleId);

    /**
     * Remove a dismissed violation (if user wants to see it again)
     * Equivalent to TypeScript: undismissViolation(scheduleId: number, violationHash: string): Promise<boolean>
     * Equivalent to IPC: 'db:undismissViolation'
     */
    boolean undismissViolation(Integer scheduleId, String violationHash);

    /**
     * Clear all dismissed violations for a schedule
     * Equivalent to TypeScript: clearDismissedViolations(scheduleId: number): Promise<boolean>
     * Equivalent to IPC: 'db:clearDismissedViolations'
     */
    boolean clearDismissedViolations(Integer scheduleId);

    /**
     * Get count of dismissed violations for a schedule
     * Equivalent to TypeScript: getDismissedViolationCount(scheduleId: number): Promise<number>
     * Equivalent to IPC: 'db:getDismissedViolationCount'
     */
    Integer getDismissedViolationCount(Integer scheduleId);

    /**
     * Clean up dismissed violations that no longer apply
     * (i.e., removed hashes that don't match any current violations)
     * Equivalent to TypeScript: cleanupDismissedViolations(scheduleId: number, currentViolationHashes: string[]): Promise<boolean>
     * Equivalent to IPC: 'db:cleanupDismissedViolations'
     */
    boolean cleanupDismissedViolations(Integer scheduleId, List<String> currentViolationHashes);

}