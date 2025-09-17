package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.rule.CreateRuleDataDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleStatsDto;
import hu.szabolcst.idorendmaker.model.dto.rule.RuleWithConditionsDto;
import hu.szabolcst.idorendmaker.service.RuleService;
import java.util.List;
import java.util.Optional;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Rule operations
 * Maps TypeScript IPC handlers to HTTP endpoints
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rules")
public class RuleController {

    private final RuleService ruleService;

    /**
     * Get all rules with their conditions and matchings
     * Equivalent to IPC: 'db:getAllRules'
     * TypeScript: getAllRules(): Promise<RuleWithConditions[]>
     */
    @GetMapping
    public ResponseEntity<List<RuleWithConditionsDto>> getAllRules() {
        log.debug("GET /api/rules - Getting all rules");
        
        final List<RuleWithConditionsDto> rules = ruleService.getAllRules();
        
        log.debug("Found {} rules", rules.size());
        return ResponseEntity.ok(rules);
    }

    /**
     * Get all active rules only
     * Equivalent to IPC: 'db:getActiveRules'
     * TypeScript: getActiveRules(): Promise<RuleWithConditions[]>
     */
    @GetMapping("/active")
    public ResponseEntity<List<RuleWithConditionsDto>> getActiveRules() {
        log.debug("GET /api/rules/active - Getting active rules");
        
        final List<RuleWithConditionsDto> rules = ruleService.getActiveRules();
        
        log.debug("Found {} active rules", rules.size());
        return ResponseEntity.ok(rules);
    }

    /**
     * Get a specific rule by ID with its conditions and matchings
     * Equivalent to IPC: 'db:getRuleById'
     * TypeScript: getRuleById(id: number): Promise<RuleWithConditions | null>
     */
    @GetMapping("/{id}")
    public ResponseEntity<RuleWithConditionsDto> getRuleById(@PathVariable final Integer id) {
        log.debug("GET /api/rules/{} - Getting rule by id", id);
        
        final Optional<RuleWithConditionsDto> rule = ruleService.getRuleById(id);
        
        if (rule.isPresent()) {
            log.debug("Found rule: {}", rule.get().getName());
            return ResponseEntity.ok(rule.get());
        } else {
            log.debug("Rule not found with id: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create a new rule with conditions and matchings
     * Equivalent to IPC: 'db:createRule'
     * TypeScript: createRule(data: CreateRuleData): Promise<RuleWithConditions>
     */
    @PostMapping
    public ResponseEntity<RuleWithConditionsDto> createRule(@RequestBody final CreateRuleDataDto data) {
        log.debug("POST /api/rules - Creating new rule with name: {}", data.getName());
        
        final RuleWithConditionsDto createdRule = ruleService.createRule(data);
        
        log.info("Created rule with id: {} and name: {}", createdRule.getId(), createdRule.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdRule);
    }

    /**
     * Update an existing rule
     * Equivalent to IPC: 'db:updateRule'
     * TypeScript: updateRule(id: number, data: Partial<CreateRuleData>): Promise<RuleWithConditions | null>
     */
    @PutMapping("/{id}")
    public ResponseEntity<RuleWithConditionsDto> updateRule(
            @PathVariable final Integer id,
            @RequestBody final CreateRuleDataDto data) {
        log.debug("PUT /api/rules/{} - Updating rule", id);
        
        final Optional<RuleWithConditionsDto> updatedRule = ruleService.updateRule(id, data);
        
        if (updatedRule.isPresent()) {
            log.info("Updated rule with id: {}", id);
            return ResponseEntity.ok(updatedRule.get());
        } else {
            log.debug("Rule not found for update: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete a rule
     * Equivalent to IPC: 'db:deleteRule'
     * TypeScript: deleteRule(id: number): Promise<boolean>
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteRule(@PathVariable final Integer id) {
        log.debug("DELETE /api/rules/{} - Deleting rule", id);
        
        final boolean success = ruleService.deleteRule(id);
        
        if (success) {
            log.info("Deleted rule with id: {}", id);
            return ResponseEntity.ok(true);
        } else {
            log.debug("Rule not found for deletion: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Toggle rule active status
     * Equivalent to IPC: 'db:toggleRuleActive'
     * TypeScript: toggleRuleActive(id: number, isActive: boolean): Promise<boolean>
     */
    @PutMapping("/{id}/active")
    public ResponseEntity<Boolean> toggleRuleActive(
            @PathVariable final Integer id,
            @RequestParam("active") final Boolean isActive) {
        log.debug("PUT /api/rules/{}/active?active={} - Toggling rule active status", id, isActive);
        
        final boolean success = ruleService.toggleRuleActive(id, isActive);
        
        if (success) {
            log.info("Toggled rule {} active status to: {}", id, isActive);
            return ResponseEntity.ok(true);
        } else {
            log.debug("Failed to toggle rule {} active status", id);
            return ResponseEntity.badRequest().body(false);
        }
    }

    /**
     * Get rule statistics
     * Equivalent to IPC: 'db:getRuleStats'
     * TypeScript: getRuleStats(): Promise<{totalRules: number, activeRules: number, inactiveRules: number}>
     */
    @GetMapping("/stats")
    public ResponseEntity<RuleStatsDto> getRuleStats() {
        log.debug("GET /api/rules/stats - Getting rule statistics");
        
        final RuleStatsDto stats = ruleService.getRuleStats();
        
        log.debug("Rule stats - total: {}, active: {}, inactive: {}", 
                 stats.getTotalRules(), stats.getActiveRules(), stats.getInactiveRules());
        return ResponseEntity.ok(stats);
    }

    /**
     * Search rules by name or description
     * Equivalent to IPC: 'db:searchRules'
     * TypeScript: searchRules(searchTerm: string): Promise<RuleWithConditions[]>
     */
    @GetMapping("/search")
    public ResponseEntity<List<RuleWithConditionsDto>> searchRules(@RequestParam("term") final String searchTerm) {
        log.debug("GET /api/rules/search?term={} - Searching rules", searchTerm);
        
        final List<RuleWithConditionsDto> rules = ruleService.searchRules(searchTerm);
        
        log.debug("Found {} rules matching search term: {}", rules.size(), searchTerm);
        return ResponseEntity.ok(rules);
    }

    /**
     * Dismiss a rule violation for a specific schedule
     * Equivalent to IPC: 'db:dismissViolation'
     * TypeScript: dismissViolation(scheduleId: number, violationHash: string): Promise<boolean>
     */
    @PostMapping("/violations/dismiss")
    public ResponseEntity<Boolean> dismissViolation(@RequestBody final DismissViolationRequest request) {
        log.debug("POST /api/rules/violations/dismiss - Dismissing violation for schedule {} with hash {}", 
                 request.getScheduleId(), request.getViolationHash());
        
        final boolean success = ruleService.dismissViolation(request.getScheduleId(), request.getViolationHash());
        
        if (success) {
            log.info("Dismissed violation for schedule {}", request.getScheduleId());
            return ResponseEntity.ok(true);
        } else {
            log.debug("Failed to dismiss violation for schedule {}", request.getScheduleId());
            return ResponseEntity.badRequest().body(false);
        }
    }

    /**
     * Get all dismissed violations for a schedule
     * Equivalent to IPC: 'db:getDismissedViolations'
     * TypeScript: getDismissedViolations(scheduleId: number): Promise<string[]>
     */
    @GetMapping("/violations/dismissed")
    public ResponseEntity<List<String>> getDismissedViolations(@RequestParam("scheduleId") final Integer scheduleId) {
        log.debug("GET /api/rules/violations/dismissed?scheduleId={} - Getting dismissed violations", scheduleId);
        
        final List<String> dismissedHashes = ruleService.getDismissedViolations(scheduleId);
        
        log.debug("Found {} dismissed violations for schedule {}", dismissedHashes.size(), scheduleId);
        return ResponseEntity.ok(dismissedHashes);
    }

    /**
     * Remove a dismissed violation (if user wants to see it again)
     * Equivalent to IPC: 'db:undismissViolation'
     * TypeScript: undismissViolation(scheduleId: number, violationHash: string): Promise<boolean>
     */
    @DeleteMapping("/violations/dismiss")
    public ResponseEntity<Boolean> undismissViolation(@RequestBody final DismissViolationRequest request) {
        log.debug("DELETE /api/rules/violations/dismiss - Undismissing violation for schedule {} with hash {}", 
                 request.getScheduleId(), request.getViolationHash());
        
        final boolean success = ruleService.undismissViolation(request.getScheduleId(), request.getViolationHash());
        
        if (success) {
            log.info("Undismissed violation for schedule {}", request.getScheduleId());
            return ResponseEntity.ok(true);
        } else {
            log.debug("Failed to undismiss violation for schedule {}", request.getScheduleId());
            return ResponseEntity.badRequest().body(false);
        }
    }

    /**
     * Clear all dismissed violations for a schedule
     * Equivalent to IPC: 'db:clearDismissedViolations'
     * TypeScript: clearDismissedViolations(scheduleId: number): Promise<boolean>
     */
    @DeleteMapping("/violations/dismissed")
    public ResponseEntity<Boolean> clearDismissedViolations(@RequestParam("scheduleId") final Integer scheduleId) {
        log.debug("DELETE /api/rules/violations/dismissed?scheduleId={} - Clearing dismissed violations", scheduleId);
        
        final boolean success = ruleService.clearDismissedViolations(scheduleId);
        
        if (success) {
            log.info("Cleared all dismissed violations for schedule {}", scheduleId);
            return ResponseEntity.ok(true);
        } else {
            log.debug("Failed to clear dismissed violations for schedule {}", scheduleId);
            return ResponseEntity.badRequest().body(false);
        }
    }

    /**
     * Get count of dismissed violations for a schedule
     * Equivalent to IPC: 'db:getDismissedViolationCount'
     * TypeScript: getDismissedViolationCount(scheduleId: number): Promise<number>
     */
    @GetMapping("/violations/dismissed/count")
    public ResponseEntity<Integer> getDismissedViolationCount(@RequestParam("scheduleId") final Integer scheduleId) {
        log.debug("GET /api/rules/violations/dismissed/count?scheduleId={} - Getting dismissed violation count", scheduleId);
        
        final Integer count = ruleService.getDismissedViolationCount(scheduleId);
        
        log.debug("Found {} dismissed violations for schedule {}", count, scheduleId);
        return ResponseEntity.ok(count);
    }

    /**
     * Clean up dismissed violations that no longer apply
     * Equivalent to IPC: 'db:cleanupDismissedViolations'
     * TypeScript: cleanupDismissedViolations(scheduleId: number, currentViolationHashes: string[]): Promise<boolean>
     */
    @PostMapping("/violations/cleanup")
    public ResponseEntity<Boolean> cleanupDismissedViolations(@RequestBody final CleanupViolationsRequest request) {
        log.debug("POST /api/rules/violations/cleanup - Cleaning up dismissed violations for schedule {} with {} current hashes", 
                 request.getScheduleId(), request.getCurrentViolationHashes().size());
        
        final boolean success = ruleService.cleanupDismissedViolations(
                request.getScheduleId(), request.getCurrentViolationHashes());
        
        if (success) {
            log.info("Cleaned up dismissed violations for schedule {}", request.getScheduleId());
            return ResponseEntity.ok(true);
        } else {
            log.debug("Failed to cleanup dismissed violations for schedule {}", request.getScheduleId());
            return ResponseEntity.badRequest().body(false);
        }
    }

    // Request DTOs for endpoints that need them

    @Data
    public static class DismissViolationRequest {

        private Integer scheduleId;
        private String violationHash;

    }

    @Data
    public static class CleanupViolationsRequest {

        private Integer scheduleId;
        private List<String> currentViolationHashes;

    }

}
