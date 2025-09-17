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
 * REST Controller for Level operations
 * Maps TypeScript IPC handlers to HTTP endpoints
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/levels")
public class LevelController {

    private final LevelService levelService;

    /**
     * Get all levels ordered by sort order
     * Equivalent to IPC: 'db:getAllLevels'
     * TypeScript: getAllLevels(): Promise<Level[]>
     */
    @GetMapping
    public ResponseEntity<List<LevelDto>> getAllLevels() {
        log.debug("GET /api/levels - Getting all levels");
        
        final List<LevelDto> levels = levelService.getAllLevels();
        
        log.debug("Found {} levels", levels.size());
        return ResponseEntity.ok(levels);
    }

    /**
     * Get the default level (Döntő I.)
     * Equivalent to IPC: 'db:getDefaultLevel'  
     * TypeScript: getDefaultLevel(): Promise<Level>
     */
    @GetMapping("/default")
    public ResponseEntity<LevelDto> getDefaultLevel() {
        log.debug("GET /api/levels/default - Getting default level");
        
        final LevelDto defaultLevel = levelService.getDefaultLevel();
        
        log.debug("Found default level: {}", defaultLevel.getName());
        return ResponseEntity.ok(defaultLevel);
    }

    /**
     * Get level by ID
     * Equivalent to IPC: 'db:getLevelById'
     * TypeScript: getLevelById(id: number): Promise<Level | null>
     * Note: Marked as dead code in service but included for completeness
     */
    @GetMapping("/{id}")
    public ResponseEntity<LevelDto> getLevelById(@PathVariable final Integer id) {
        log.debug("GET /api/levels/{} - Getting level by id", id);
        
        final Optional<LevelDto> level = levelService.getLevelById(id);
        
        if (level.isPresent()) {
            log.debug("Found level: {}", level.get().getName());
            return ResponseEntity.ok(level.get());
        } else {
            log.debug("Level not found with id: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get levels by type
     * Equivalent to IPC: 'db:getLevelsByType' 
     * TypeScript: getLevelsByType(levelType: string): Promise<Level[]>
     * Note: Marked as dead code in service but included for completeness
     */
    @GetMapping(params = "type")
    public ResponseEntity<List<LevelDto>> getLevelsByType(@RequestParam("type") final String levelType) {
        log.debug("GET /api/levels?type={} - Getting levels by type", levelType);
        
        final List<LevelDto> levels = levelService.getLevelsByType(levelType);
        
        log.debug("Found {} levels for type: {}", levels.size(), levelType);
        return ResponseEntity.ok(levels);
    }
}
