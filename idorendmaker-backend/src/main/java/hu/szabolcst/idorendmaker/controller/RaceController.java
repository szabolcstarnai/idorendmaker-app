package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import hu.szabolcst.idorendmaker.service.RaceService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Race operations
 * Maps TypeScript IPC handlers to HTTP endpoints
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/races")
public class RaceController {

    private final RaceService raceService;

    /**
     * Get all races with their age groups, ordered by occurrence and name
     * Equivalent to IPC: 'db:getAllRaces'
     * TypeScript: getAllRaces(): Promise<RaceWithAgeGroups[]>
     */
    @GetMapping
    public ResponseEntity<List<RaceWithAgeGroupsDto>> getAllRaces() {
        log.debug("GET /api/races - Getting all races");
        
        final List<RaceWithAgeGroupsDto> races = raceService.getAllRaces();
        
        log.debug("Found {} races", races.size());
        return ResponseEntity.ok(races);
    }

    /**
     * Search races by term across multiple fields including age groups
     * Equivalent to IPC: 'db:searchRaces'
     * TypeScript: searchRaces(searchTerm: string): Promise<RaceWithAgeGroups[]>
     */
    @GetMapping("/search")
    public ResponseEntity<List<RaceWithAgeGroupsDto>> searchRaces(@RequestParam("term") final String searchTerm) {
        log.debug("GET /api/races/search?term={} - Searching races", searchTerm);
        
        final List<RaceWithAgeGroupsDto> races = raceService.searchRaces(searchTerm);
        
        log.debug("Found {} races matching search term: {}", races.size(), searchTerm);
        return ResponseEntity.ok(races);
    }

    /**
     * Update race visibility (hidden status)
     * Equivalent to IPC: 'db:updateRaceHidden'
     * TypeScript: updateRaceHidden(raceId: number, hidden: boolean): Promise<boolean>
     */
    @PutMapping("/{id}/hidden")
    public ResponseEntity<Boolean> updateRaceHidden(
            @PathVariable final Integer id,
            @RequestParam("hidden") final boolean hidden) {
        log.debug("PUT /api/races/{}/hidden?hidden={} - Updating race visibility", id, hidden);
        
        final boolean success = raceService.updateRaceHidden(id, hidden);
        
        if (success) {
            log.debug("Successfully updated race {} hidden status to: {}", id, hidden);
            return ResponseEntity.ok(true);
        } else {
            log.warn("Failed to update race {} hidden status", id);
            return ResponseEntity.badRequest().body(false);
        }
    }

    /**
     * Get all age groups ordered by name
     * Equivalent to IPC: 'db:getAllAgeGroups'
     * TypeScript: getAllAgeGroups(): Promise<{id: number, name: string, createdAt: Date}[]>
     */
    @GetMapping("/age-groups")
    public ResponseEntity<List<AgeGroupDto>> getAllAgeGroups() {
        log.debug("GET /api/races/age-groups - Getting all age groups");
        
        final List<AgeGroupDto> ageGroups = raceService.getAllAgeGroups();
        
        log.debug("Found {} age groups", ageGroups.size());
        return ResponseEntity.ok(ageGroups);
    }

    /**
     * Get statistics about the database
     * Equivalent to IPC: 'db:getStats'
     * TypeScript: getStats(): Promise<{races: number, ageGroups: number, schedules: number}>
     */
    @GetMapping("/stats")
    public ResponseEntity<DatabaseStatsDto> getStats() {
        log.debug("GET /api/races/stats - Getting database statistics");
        
        final DatabaseStatsDto stats = raceService.getStats();
        
        log.debug("Database stats - races: {}, ageGroups: {}, schedules: {}", 
                 stats.getRaces(), stats.getAgeGroups(), stats.getSchedules());
        return ResponseEntity.ok(stats);
    }
}
