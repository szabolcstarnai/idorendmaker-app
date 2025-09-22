package hu.szabolcst.idorendmaker.controller;

import hu.szabolcst.idorendmaker.model.dto.boatclass.BoatClassDto;
import hu.szabolcst.idorendmaker.service.BoatClassService;
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
 * REST Controller for BoatClass operations
 * Provides endpoints for enhanced rule system with boat class metadata
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/boat-classes")
public class BoatClassController {

    private final BoatClassService boatClassService;

    /**
     * Get all boat classes ordered by name
     * Used for frontend dropdown population and rule system
     */
    @GetMapping
    public ResponseEntity<List<BoatClassDto>> getAllBoatClasses() {
        log.debug("GET /api/boat-classes - Getting all boat classes");

        final List<BoatClassDto> boatClasses = boatClassService.getAllBoatClasses();

        log.debug("Found {} boat classes", boatClasses.size());
        return ResponseEntity.ok(boatClasses);
    }

    /**
     * Get distinct boat types for rule condition dropdown
     * Returns unique boat types like "Kajak", "Minikajak", "Kenu"
     */
    @GetMapping("/types")
    public ResponseEntity<List<String>> getDistinctBoatTypes() {
        log.debug("GET /api/boat-classes/types - Getting distinct boat types");

        final List<String> boatTypes = boatClassService.getDistinctBoatTypes();

        log.debug("Found {} distinct boat types", boatTypes.size());
        return ResponseEntity.ok(boatTypes);
    }

    /**
     * Get distinct seat counts for rule condition dropdown
     * Returns seat count texts like "1", "2", "4", "csapat"
     */
    @GetMapping("/seat-counts")
    public ResponseEntity<List<String>> getDistinctSeatCounts() {
        log.debug("GET /api/boat-classes/seat-counts - Getting distinct seat counts");

        final List<String> seatCounts = boatClassService.getDistinctSeatCountTexts();

        log.debug("Found {} distinct seat counts", seatCounts.size());
        return ResponseEntity.ok(seatCounts);
    }

    /**
     * Get boat class by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<BoatClassDto> getBoatClassById(@PathVariable final Integer id) {
        log.debug("GET /api/boat-classes/{} - Getting boat class by id", id);

        final Optional<BoatClassDto> boatClass = boatClassService.getBoatClassById(id);

        if (boatClass.isPresent()) {
            log.debug("Found boat class: {}", boatClass.get().getName());
            return ResponseEntity.ok(boatClass.get());
        } else {
            log.debug("Boat class not found with id: {}", id);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get boat class by name
     */
    @GetMapping(params = "name")
    public ResponseEntity<BoatClassDto> getBoatClassByName(@RequestParam("name") final String name) {
        log.debug("GET /api/boat-classes?name={} - Getting boat class by name", name);

        final Optional<BoatClassDto> boatClass = boatClassService.getBoatClassByName(name);

        if (boatClass.isPresent()) {
            log.debug("Found boat class: {}", boatClass.get().getName());
            return ResponseEntity.ok(boatClass.get());
        } else {
            log.debug("Boat class not found with name: {}", name);
            return ResponseEntity.notFound().build();
        }
    }
}