package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.entity.ScheduleItem;
import hu.szabolcst.idorendmaker.model.entity.catalog.Level;
import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import hu.szabolcst.idorendmaker.repository.catalog.LevelRepository;
import hu.szabolcst.idorendmaker.service.RaceCatalogLookupService.RaceDisplayData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Populates the denormalized snapshot fields on a {@link ScheduleItem} from
 * the catalog datasource. The snapshot is what survives future catalog edits
 * for already-saved schedules.
 *
 * <p><strong>Overwrite semantics:</strong> every call to
 * {@link #populate(ScheduleItem, String, String)} unconditionally overwrites
 * all snapshot fields ({@code raceName}, {@code raceDiscipline},
 * {@code raceGender}, {@code raceDistance}, {@code raceBoatClassName},
 * {@code raceAgeGroupsDisplay}, {@code levelName}, {@code levelType}) with
 * the current catalog values. There is no incremental merge; callers that
 * want to preserve a previous snapshot should not call this method again.
 *
 * <p>Race-side resolution (race name / discipline / gender / distance /
 * boat-class name / age-groups display) is delegated to
 * {@link RaceCatalogLookupService#loadRaceDisplayData(String)} so that every
 * consumer of the catalog snapshot produces identical display output. Level
 * resolution is local because no other caller currently needs it.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ScheduleItemSnapshotPopulator {

    private final RaceCatalogLookupService raceCatalogLookupService;
    private final LevelRepository levelRepository;

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

        final RaceDisplayData display = raceCatalogLookupService.loadRaceDisplayData(raceCode);
        if (display == null) {
            throw new IllegalArgumentException("Unknown race code: " + raceCode);
        }
        final Race race = display.race();

        item.setRaceName(race.getName());
        item.setRaceDiscipline(race.getDiscipline());
        item.setRaceGender(race.getGender());
        item.setRaceDistance(race.getDistance());
        item.setRaceBoatClassName(display.boatClassName());
        item.setRaceAgeGroupsDisplay(display.ageGroupsDisplay());

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
