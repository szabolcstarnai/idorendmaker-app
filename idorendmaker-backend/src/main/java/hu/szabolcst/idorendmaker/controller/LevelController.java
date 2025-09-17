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

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping({"/api/levels"})
public class LevelController {

    private final LevelService levelService;

    @GetMapping
    public ResponseEntity<List<LevelDto>> getAllLevels() {
        log.debug("GET /api/levels - Getting all levels");

        final List<LevelDto> levels = this.levelService.getAllLevels();

        log.debug("Found {} levels", levels.size());
        return ResponseEntity.ok(levels);
    }

    @GetMapping({"/default"})
    public ResponseEntity<LevelDto> getDefaultLevel() {
        log.debug("GET /api/levels/default - Getting default level");

        final LevelDto defaultLevel = this.levelService.getDefaultLevel();

        log.debug("Found default level: {}", defaultLevel.getName());
        return ResponseEntity.ok(defaultLevel);
    }

    @GetMapping({"/{id}"})
    public ResponseEntity<LevelDto> getLevelById(@PathVariable final Integer id) {
        log.debug("GET /api/levels/{} - Getting level by id", id);

        final Optional<LevelDto> level = this.levelService.getLevelById(id);

        if (level.isPresent()) {
            log.debug("Found level: {}", level.get().getName());
            return ResponseEntity.ok(level.get());
        }
        log.debug("Level not found with id: {}", id);
        return ResponseEntity.notFound().build();
    }

    @GetMapping(params = {"type"})
    public ResponseEntity<List<LevelDto>> getLevelsByType(@RequestParam("type") final String levelType) {
        log.debug("GET /api/levels?type={} - Getting levels by type", levelType);

        final List<LevelDto> levels = this.levelService.getLevelsByType(levelType);

        log.debug("Found {} levels for type: {}", levels.size(), levelType);
        return ResponseEntity.ok(levels);
    }
}
