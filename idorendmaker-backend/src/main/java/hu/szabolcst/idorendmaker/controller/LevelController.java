package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.service.LevelService;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST Controller for Level operations against the read-only catalog
 * datasource. Path variables are the catalog's string {@code code} values.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/levels")
public class LevelController {

    private final LevelService levelService;

    /**
     * Get all levels ordered by sort order.
     */
    @GetMapping
    public ResponseEntity<List<LevelDto>> getAllLevels() {
        log.debug("GET /api/levels - Getting all levels");

        final List<LevelDto> levels = levelService.getAllLevels();

        log.debug("Found {} levels", levels.size());
        return ResponseEntity.ok(levels);
    }

    /**
     * Get the default level.
     */
    @GetMapping("/default")
    public ResponseEntity<LevelDto> getDefaultLevel() {
        log.debug("GET /api/levels/default - Getting default level");

        final LevelDto defaultLevel = levelService.getDefaultLevel();

        if (defaultLevel == null) {
            log.debug("No default level found");
            return ResponseEntity.notFound().build();
        }
        log.debug("Found default level: {}", defaultLevel.getName());
        return ResponseEntity.ok(defaultLevel);
    }

    /**
     * Get level by catalog code.
     */
    @GetMapping("/{code}")
    public ResponseEntity<LevelDto> getLevelByCode(@PathVariable final String code) {
        log.debug("GET /api/levels/{} - Getting level by code", code);

        final Optional<LevelDto> level = levelService.getLevelByCode(code);

        if (level.isPresent()) {
            log.debug("Found level: {}", level.get().getName());
            return ResponseEntity.ok(level.get());
        } else {
            log.debug("Level not found with code: {}", code);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get levels by type.
     */
    @GetMapping(params = "type")
    public ResponseEntity<List<LevelDto>> getLevelsByType(@RequestParam("type") final String levelType) {
        log.debug("GET /api/levels?type={} - Getting levels by type", levelType);

        final List<LevelDto> levels = levelService.getLevelsByType(levelType);

        log.debug("Found {} levels for type: {}", levels.size(), levelType);
        return ResponseEntity.ok(levels);
    }
}
