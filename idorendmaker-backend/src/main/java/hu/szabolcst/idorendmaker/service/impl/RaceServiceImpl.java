package hu.szabolcst.idorendmaker.service.impl;

import hu.szabolcst.idorendmaker.mapper.RaceMapper;
import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.repository.jdbc.AgeGroupJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.RaceJdbcRepository;
import hu.szabolcst.idorendmaker.repository.jdbc.ScheduleJdbcRepository;
import hu.szabolcst.idorendmaker.service.RaceService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RaceServiceImpl implements RaceService {

    private final RaceJdbcRepository raceRepository;
    private final AgeGroupJdbcRepository ageGroupRepository;
    private final ScheduleJdbcRepository scheduleRepository;
    private final RaceMapper raceMapper;

    @Transactional
    public List<RaceWithAgeGroupsDto> getAllRaces() {
        Objects.requireNonNull(this.raceMapper);
        return this.raceRepository.findAllWithAgeGroupsOrdered().stream().map(this.raceMapper::toRaceWithAgeGroupsDto)
            .toList();
    }


    @Transactional
    public List<RaceWithAgeGroupsDto> searchRaces(final String searchTerm) {
        Objects.requireNonNull(this.raceMapper);
        return this.raceRepository.findBySearchTermWithAgeGroups(searchTerm).stream().map(this.raceMapper::toRaceWithAgeGroupsDto)
            .toList();
    }


    @Transactional
    public boolean updateRaceHidden(final Integer raceId, final boolean hidden) {
        try {
            final Race race = this.raceRepository.findById(raceId).orElse(null);
            if (race == null) {
                return false;
            }

            race.setHidden(hidden);
            race.setUpdatedAt(LocalDateTime.now());
            this.raceRepository.save(race);
            return true;
        } catch (final Exception e) {

            return false;
        }
    }


    @Transactional
    public List<AgeGroupDto> getAllAgeGroups() {
        Objects.requireNonNull(this.raceMapper);
        return this.ageGroupRepository.findAllByOrderByNameAsc().stream().map(this.raceMapper::toAgeGroupDto)
            .toList();
    }


    @Transactional
    public DatabaseStatsDto getStats() {
        final long raceCount = this.raceRepository.count();
        final long ageGroupCount = this.ageGroupRepository.count();
        final long scheduleCount = this.scheduleRepository.count();

        final DatabaseStatsDto stats = new DatabaseStatsDto();
        stats.setRaces((int) raceCount);
        stats.setAgeGroups((int) ageGroupCount);
        stats.setSchedules((int) scheduleCount);

        return stats;
    }
}


/* Location:              C:\Users\Szabolcs\Documents\PROJECTS\idorendmaker-app\idorendmaker-backend\target\idorendmaker-backend-1.0.0.jar!\BOOT-INF\classes\hu\szabolcst\idorendmaker\service\impl\RaceServiceImpl.class
 * Java compiler version: 21 (65.0)
 * JD-Core Version:       1.1.3
 */