package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.entity.catalog.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.catalog.BoatClass;
import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import hu.szabolcst.idorendmaker.model.entity.catalog.RaceAgeGroup;
import hu.szabolcst.idorendmaker.repository.catalog.AgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.catalog.BoatClassRepository;
import hu.szabolcst.idorendmaker.repository.catalog.RaceAgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.catalog.RaceRepository;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Small helper component that wraps catalog-datasource reads used by
 * user-side services that operate against the catalog transaction manager.
 * Follows the same pattern as {@link ScheduleItemSnapshotPopulator}.
 *
 * <p>Each public method is annotated with
 * {@code @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")}
 * so that callers annotated with the default transaction manager can still
 * perform nested read-only catalog lookups safely.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class RaceCatalogLookupService {

    private final RaceRepository raceRepository;
    private final BoatClassRepository boatClassRepository;
    private final RaceAgeGroupRepository raceAgeGroupRepository;
    private final AgeGroupRepository ageGroupRepository;

    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<Race> findAllRaces() {
        return raceRepository.findAll();
    }

    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public Optional<Race> findRaceByCode(final String raceCode) {
        if (raceCode == null) {
            return Optional.empty();
        }
        return raceRepository.findById(raceCode);
    }

    /**
     * Bulk load races by code in a single {@code IN (...)} query. Returns a
     * map keyed by race code. Missing codes are absent from the returned map.
     */
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public Map<String, Race> findRacesByCodes(final Collection<String> raceCodes) {
        if (raceCodes == null || raceCodes.isEmpty()) {
            return Collections.emptyMap();
        }
        final Set<String> distinct = raceCodes.stream()
            .filter(c -> c != null)
            .collect(Collectors.toSet());
        if (distinct.isEmpty()) {
            return Collections.emptyMap();
        }
        return raceRepository.findAllByCodeIn(distinct).stream()
            .collect(Collectors.toMap(Race::getCode, r -> r, (a, b) -> a));
    }

    /**
     * Build a display-ready data bundle for a single race, resolving its
     * boat class name and age groups display string. Returns {@code null}
     * if the race itself is not found.
     */
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public RaceDisplayData loadRaceDisplayData(final String raceCode) {
        if (raceCode == null) {
            return null;
        }
        final Optional<Race> raceOpt = raceRepository.findById(raceCode);
        if (raceOpt.isEmpty()) {
            return null;
        }
        final Race race = raceOpt.get();

        final String boatClassCode = race.getBoatClassCode();
        final BoatClass boatClass = boatClassCode == null
            ? null
            : boatClassRepository.findById(boatClassCode).orElse(null);
        // Fall back to the raw code when the boat class is missing from the
        // catalog so the display string is never null.
        final String boatClassName = boatClass != null ? boatClass.getName() : boatClassCode;

        final List<RaceAgeGroup> raceAgeGroups = raceAgeGroupRepository.findAllByRaceCode(raceCode);
        final List<AgeGroup> resolvedAgeGroups;
        final String ageGroupsDisplay;
        if (raceAgeGroups.isEmpty()) {
            resolvedAgeGroups = List.of();
            ageGroupsDisplay = null;
        } else {
            resolvedAgeGroups = raceAgeGroups.stream()
                .map(rag -> ageGroupRepository.findById(rag.getAgeGroupCode()).orElse(null))
                .filter(ag -> ag != null)
                .sorted(Comparator
                    .comparing((AgeGroup ag) -> ag.getSortOrder(),
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(AgeGroup::getName,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
            final String joined = resolvedAgeGroups.stream()
                .map(AgeGroup::getName)
                .filter(name -> name != null)
                .collect(Collectors.joining(", "));
            ageGroupsDisplay = joined.isEmpty() ? null : joined;
        }

        return new RaceDisplayData(race, boatClass, boatClassName, ageGroupsDisplay, resolvedAgeGroups);
    }

    /**
     * Immutable bundle returned by {@link #loadRaceDisplayData(String)}.
     *
     * @param boatClass the resolved catalog boat class, or {@code null} when
     *                  the race references a code the catalog does not know
     * @param boatClassName the boat class display name, falling back to the
     *                      raw code when {@code boatClass} is {@code null}
     */
    public record RaceDisplayData(Race race, BoatClass boatClass, String boatClassName, String ageGroupsDisplay,
        List<AgeGroup> ageGroups) {
    }
}
