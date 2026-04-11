package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import hu.szabolcst.idorendmaker.service.RaceService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Race operations against the read-only catalog
 * datasource. The {@code PUT /api/races/{code}/hidden} mutation that used
 * to exist was dropped in Phase 4a: the catalog is read-only and there is
 * no overlay table yet. A later phase will reintroduce hiding via a
 * user-DB overlay.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/races")
public class RaceController {

    private final RaceService raceService;

    /**
     * Get all races with their age groups, ordered by {@code sortOrder} and {@code name}.
     */
    @GetMapping
    public ResponseEntity<List<RaceWithAgeGroupsAndBoatClassDto>> getAllRaces() {
        log.debug("GET /api/races - Getting all races");

        final List<RaceWithAgeGroupsAndBoatClassDto> races = raceService.getAllRaces();

        log.debug("Found {} races", races.size());
        return ResponseEntity.ok(races);
    }

    /**
     * Search races by term across the scalar fields.
     */
    @GetMapping("/search")
    public ResponseEntity<List<RaceWithAgeGroupsAndBoatClassDto>> searchRaces(@RequestParam("term") final String searchTerm) {
        log.debug("GET /api/races/search?term={} - Searching races", searchTerm);

        final List<RaceWithAgeGroupsAndBoatClassDto> races = raceService.searchRaces(searchTerm);

        log.debug("Found {} races matching search term: {}", races.size(), searchTerm);
        return ResponseEntity.ok(races);
    }

    /**
     * Get all age groups ordered by name.
     */
    @GetMapping("/age-groups")
    public ResponseEntity<List<AgeGroupDto>> getAllAgeGroups() {
        log.debug("GET /api/races/age-groups - Getting all age groups");

        final List<AgeGroupDto> ageGroups = raceService.getAllAgeGroups();

        log.debug("Found {} age groups", ageGroups.size());
        return ResponseEntity.ok(ageGroups);
    }

    /**
     * Get statistics about the database.
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
