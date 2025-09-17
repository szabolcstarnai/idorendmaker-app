package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.matching.ProcessedVersenyszamDto;
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

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/races"})
public class RaceController {

    private final RaceService raceService;

    @GetMapping
    public ResponseEntity<List<RaceWithAgeGroupsDto>> getAllRaces() {
        log.debug("GET /api/races - Getting all races");

        final List<RaceWithAgeGroupsDto> races = this.raceService.getAllRaces();

        log.debug("Found {} races", races.size());
        return ResponseEntity.ok(races);
    }

    @GetMapping({"/search"})
    public ResponseEntity<List<RaceWithAgeGroupsDto>> searchRaces(@RequestParam("term") final String searchTerm) {
        log.debug("GET /api/races/search?term={} - Searching races", searchTerm);

        final List<RaceWithAgeGroupsDto> races = this.raceService.searchRaces(searchTerm);

        log.debug("Found {} races matching search term: {}", races.size(), searchTerm);
        return ResponseEntity.ok(races);
    }

    @PutMapping({"/{id}/hidden"})
    public ResponseEntity<Boolean> updateRaceHidden(@PathVariable final Integer id, @RequestParam("hidden") final boolean hidden) {
        log.debug("PUT /api/races/{}/hidden?hidden={} - Updating race visibility", id, hidden);

        final boolean success = this.raceService.updateRaceHidden(id, hidden);

        if (success) {
            log.debug("Successfully updated race {} hidden status to: {}", id, hidden);
            return ResponseEntity.ok(Boolean.TRUE);
        }
        log.warn("Failed to update race {} hidden status", id);
        return ResponseEntity.badRequest().body(Boolean.FALSE);
    }


    @GetMapping({"/age-groups"})
    public ResponseEntity<List<AgeGroupDto>> getAllAgeGroups() {
        log.debug("GET /api/races/age-groups - Getting all age groups");

        final List<AgeGroupDto> ageGroups = this.raceService.getAllAgeGroups();

        log.debug("Found {} age groups", ageGroups.size());
        return ResponseEntity.ok(ageGroups);
    }


    @GetMapping({"/stats"})
    public ResponseEntity<DatabaseStatsDto> getStats() {
        log.debug("GET /api/races/stats - Getting database statistics");

        final DatabaseStatsDto stats = this.raceService.getStats();

        log.debug("Database stats - races: {}, ageGroups: {}, schedules: {}", stats
            .getRaces(), stats.getAgeGroups(), stats.getSchedules());
        return ResponseEntity.ok(stats);
    }

}