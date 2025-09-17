package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RaceMapper;
import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.repository.AgeGroupRepository;
import hu.szabolcst.idorendmaker.repository.RaceRepository;
import hu.szabolcst.idorendmaker.repository.ScheduleRepository;
import hu.szabolcst.idorendmaker.service.RaceService;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RaceServiceImpl implements RaceService {

    private final RaceRepository raceRepository;
    private final AgeGroupRepository ageGroupRepository;
    private final ScheduleRepository scheduleRepository;
    private final RaceMapper raceMapper;

    @Override
    @Transactional(readOnly = true)
    public List<RaceWithAgeGroupsDto> getAllRaces() {
        return raceRepository.findAllWithAgeGroupsOrdered().stream()
                .map(raceMapper::toRaceWithAgeGroupsDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RaceWithAgeGroupsDto> searchRaces(final String searchTerm) {
        return raceRepository.findBySearchTermWithAgeGroups(searchTerm).stream()
                .map(raceMapper::toRaceWithAgeGroupsDto)
                .toList();
    }

    @Override
    @Transactional
    public boolean updateRaceHidden(final Integer raceId, final boolean hidden) {
        try {
            final Race race = raceRepository.findById(raceId).orElse(null);
            if (race == null) {
                return false;
            }
            
            race.setHidden(hidden);
            race.setUpdatedAt(LocalDateTime.now());
            raceRepository.save(race);
            return true;
        } catch (final Exception e) {
            // Log error if needed
            return false;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AgeGroupDto> getAllAgeGroups() {
        return ageGroupRepository.findAllByOrderByNameAsc().stream()
                .map(raceMapper::toAgeGroupDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DatabaseStatsDto getStats() {
        final long raceCount = raceRepository.count();
        final long ageGroupCount = ageGroupRepository.count();
        final long scheduleCount = scheduleRepository.count();

        final DatabaseStatsDto stats = new DatabaseStatsDto();
        stats.setRaces((int) raceCount);
        stats.setAgeGroups((int) ageGroupCount);
        stats.setSchedules((int) scheduleCount);
        
        return stats;
    }
}
