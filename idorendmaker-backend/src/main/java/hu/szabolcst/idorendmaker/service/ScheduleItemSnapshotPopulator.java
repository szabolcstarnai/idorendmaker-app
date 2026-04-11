package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import hu.szabolcst.idorendmaker.model.entity.catalog.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.catalog.BoatClass;
import hu.szabolcst.idorendmaker.model.entity.catalog.Level;
import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import hu.szabolcst.idorendmaker.model.entity.catalog.RaceAgeGroup;
import hu.szabolcst.idorendmaker.repository.catalog.AgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.catalog.BoatClassRepository;
import hu.szabolcst.idorendmaker.repository.catalog.LevelRepository;
import hu.szabolcst.idorendmaker.repository.catalog.RaceAgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.catalog.RaceRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves catalog entities (Race, BoatClass, Level, AgeGroup) for a given
 * race/level code pair and populates the denormalized snapshot fields on a
 * {@link ScheduleItem}. The snapshot is what survives future catalog edits
 * for already-saved schedules.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ScheduleItemSnapshotPopulator {

    private final RaceRepository raceRepository;
    private final BoatClassRepository boatClassRepository;
    private final LevelRepository levelRepository;
    private final RaceAgeGroupRepository raceAgeGroupRepository;
    private final AgeGroupRepository ageGroupRepository;

    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public void populate(final ScheduleItem item, final String raceCode, final String levelCode) {
        if (raceCode == null || raceCode.isBlank()) {
            throw new IllegalArgumentException("raceCode is required");
        }

        log.debug("Populating snapshot for ScheduleItem with raceCode={} levelCode={}", raceCode, levelCode);

        // Treat blank levelCode as absent so callers don't have to normalize.
        final String normalizedLevelCode = (levelCode == null || levelCode.isBlank()) ? null : levelCode;

        item.setRaceCode(raceCode);
        item.setLevelCode(normalizedLevelCode);

        final Race race = raceRepository.findById(raceCode)
            .orElseThrow(() -> new IllegalArgumentException("Unknown race code: " + raceCode));

        item.setRaceName(race.getName());
        item.setRaceDiscipline(race.getDiscipline());
        item.setRaceGender(race.getGender());
        item.setRaceDistance(race.getDistance());

        final String boatClassCode = race.getBoatClassCode();
        final Optional<BoatClass> boatClassOpt = boatClassCode == null
            ? Optional.empty()
            : boatClassRepository.findById(boatClassCode);
        item.setRaceBoatClassName(boatClassOpt.map(BoatClass::getName).orElse(boatClassCode));

        final List<RaceAgeGroup> raceAgeGroups = raceAgeGroupRepository.findAllByRaceCode(raceCode);
        if (raceAgeGroups.isEmpty()) {
            item.setRaceAgeGroupsDisplay(null);
        } else {
            final String joined = raceAgeGroups.stream()
                .map(rag -> ageGroupRepository.findById(rag.getAgeGroupCode()).orElse(null))
                .filter(ag -> ag != null)
                .sorted(Comparator
                    .comparing((AgeGroup ag) -> ag.getSortOrder(),
                        Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(AgeGroup::getName,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(AgeGroup::getName)
                .filter(name -> name != null)
                .collect(Collectors.joining(", "));
            item.setRaceAgeGroupsDisplay(joined.isEmpty() ? null : joined);
        }

        if (normalizedLevelCode != null) {
            final Level level = levelRepository.findById(normalizedLevelCode)
                .orElseThrow(() -> new IllegalArgumentException("Unknown level code: " + normalizedLevelCode));
            item.setLevelName(level.getName());
            item.setLevelType(level.getLevelType());
        } else {
            item.setLevelName(null);
            item.setLevelType(null);
        }
    }
}
