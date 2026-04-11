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
 * REST Controller for BoatClass operations against the read-only catalog
 * datasource. Path variables are the catalog's string {@code code} values.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/boat-classes")
public class BoatClassController {

    private final BoatClassService boatClassService;

    /**
     * Get all boat classes ordered by name.
     */
    @GetMapping
    public ResponseEntity<List<BoatClassDto>> getAllBoatClasses() {
        log.debug("GET /api/boat-classes - Getting all boat classes");

        final List<BoatClassDto> boatClasses = boatClassService.getAllBoatClasses();

        log.debug("Found {} boat classes", boatClasses.size());
        return ResponseEntity.ok(boatClasses);
    }

    /**
     * Get distinct boat type codes for rule condition dropdowns. Display
     * names are resolved separately via the boat-types catalog endpoint.
     */
    @GetMapping("/types")
    public ResponseEntity<List<String>> getDistinctBoatTypes() {
        log.debug("GET /api/boat-classes/types - Getting distinct boat type codes");

        final List<String> boatTypes = boatClassService.getDistinctBoatTypes();

        log.debug("Found {} distinct boat type codes", boatTypes.size());
        return ResponseEntity.ok(boatTypes);
    }

    /**
     * Get distinct seat counts for rule condition dropdown.
     */
    @GetMapping("/seat-counts")
    public ResponseEntity<List<String>> getDistinctSeatCounts() {
        log.debug("GET /api/boat-classes/seat-counts - Getting distinct seat counts");

        final List<String> seatCounts = boatClassService.getDistinctSeatCountTexts();

        log.debug("Found {} distinct seat counts", seatCounts.size());
        return ResponseEntity.ok(seatCounts);
    }

    /**
     * Get boat class by catalog code.
     */
    @GetMapping("/{code}")
    public ResponseEntity<BoatClassDto> getBoatClassByCode(@PathVariable final String code) {
        log.debug("GET /api/boat-classes/{} - Getting boat class by code", code);

        final Optional<BoatClassDto> boatClass = boatClassService.getBoatClassByCode(code);

        if (boatClass.isPresent()) {
            log.debug("Found boat class: {}", boatClass.get().getName());
            return ResponseEntity.ok(boatClass.get());
        } else {
            log.debug("Boat class not found with code: {}", code);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get boat class by name.
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
