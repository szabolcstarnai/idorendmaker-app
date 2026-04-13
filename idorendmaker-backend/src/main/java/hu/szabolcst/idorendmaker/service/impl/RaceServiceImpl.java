package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RaceMapper;
import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import hu.szabolcst.idorendmaker.model.entity.catalog.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.catalog.BoatClass;
import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import hu.szabolcst.idorendmaker.model.entity.catalog.RaceAgeGroup;
import hu.szabolcst.idorendmaker.repository.ScheduleRepository;
import hu.szabolcst.idorendmaker.repository.catalog.AgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.catalog.BoatClassRepository;
import hu.szabolcst.idorendmaker.repository.catalog.RaceAgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.catalog.RaceRepository;
import hu.szabolcst.idorendmaker.service.RaceService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RaceServiceImpl implements RaceService {

    private final RaceRepository raceRepository;
    private final RaceAgeGroupRepository raceAgeGroupRepository;
    private final AgeGroupRepository ageGroupRepository;
    private final BoatClassRepository boatClassRepository;
    // ScheduleRepository is a user-DB repository; it stays on the primary
    // (user) transaction manager and is only used inside getStats() for a
    // single count() call.
    private final ScheduleRepository scheduleRepository;
    private final RaceMapper raceMapper;

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<RaceWithAgeGroupsAndBoatClassDto> getAllRaces() {
        final List<Race> races = raceRepository.findAllOrdered();
        return stitchRacesWithAgeGroups(races);
    }

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<RaceWithAgeGroupsAndBoatClassDto> searchRaces(final String searchTerm) {
        final List<Race> races = raceRepository.searchByTerm(searchTerm == null ? "" : searchTerm);
        return stitchRacesWithAgeGroups(races);
    }

    @Override
    @Transactional(readOnly = true, transactionManager = "catalogTransactionManager")
    public List<AgeGroupDto> getAllAgeGroups() {
        return ageGroupRepository.findAllByOrderByNameAsc().stream()
                .map(raceMapper::toAgeGroupDto)
                .toList();
    }

    @Override
    public DatabaseStatsDto getStats() {
        // No class-level @Transactional: this method spans both the catalog
        // and user datasources, so we let each repo call run in its own
        // implicit SQLite transaction (Hibernate auto-commits reads).
        final long raceCount = raceRepository.count();
        final long ageGroupCount = ageGroupRepository.count();
        final long scheduleCount = scheduleRepository.count();

        final DatabaseStatsDto stats = new DatabaseStatsDto();
        stats.setRaces((int) raceCount);
        stats.setAgeGroups((int) ageGroupCount);
        stats.setSchedules((int) scheduleCount);

        return stats;
    }

    /**
     * Given a list of catalog Race rows, build DTOs with their age groups
     * resolved via a single bulk fetch of {@code RaceAgeGroup} and
     * {@code AgeGroup} — the new catalog entities have no JPA relationships
     * so we do the join in memory.
     */
    private List<RaceWithAgeGroupsAndBoatClassDto> stitchRacesWithAgeGroups(final List<Race> races) {
        if (races.isEmpty()) {
            return List.of();
        }

        // Bulk fetch all join rows once, then group by raceCode.
        final Map<String, List<RaceAgeGroup>> joinsByRace = raceAgeGroupRepository.findAll().stream()
            .collect(Collectors.groupingBy(RaceAgeGroup::getRaceCode));

        // Bulk fetch all age groups once into a code→entity map.
        final Map<String, AgeGroup> ageGroupsByCode = ageGroupRepository.findAll().stream()
            .collect(Collectors.toMap(AgeGroup::getCode, Function.identity()));

        // Bulk fetch all boat classes once into a code→entity map.
        final Map<String, BoatClass> boatClassesByCode = boatClassRepository.findAll().stream()
            .collect(Collectors.toMap(BoatClass::getCode, Function.identity()));

        return races.stream()
            .map(race -> {
                final RaceWithAgeGroupsAndBoatClassDto dto = raceMapper.toRaceWithAgeGroupsDto(
                    race,
                    joinsByRace.getOrDefault(race.getCode(), List.of()),
                    ageGroupsByCode);
                final BoatClass bc = boatClassesByCode.get(race.getBoatClassCode());
                dto.setBoatClassName(bc != null ? bc.getName() : race.getBoatClassCode());
                return dto;
            })
            .toList();
    }
}
