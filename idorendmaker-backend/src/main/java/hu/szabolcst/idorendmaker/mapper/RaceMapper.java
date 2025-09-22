package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import hu.szabolcst.idorendmaker.model.entity.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.Race;
import hu.szabolcst.idorendmaker.model.entity.RaceAgeGroup;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper
public interface RaceMapper {

    @Named("mapRaceAgeGroups")
    default List<AgeGroupDto> mapRaceAgeGroupsToAgeGroupDtos(final List<RaceAgeGroup> raceAgeGroups) {
        if (raceAgeGroups == null) {
            return null;
        }
        return raceAgeGroups.stream()
            .map(rag -> toAgeGroupDto(rag.getAgeGroup()))
            .toList();
    }

    default List<AgeGroupDto> toAgeGroupDtoList(final List<AgeGroup> ageGroups) {
        if (ageGroups == null) {
            return null;
        }
        return ageGroups.stream()
            .map(this::toAgeGroupDto)
            .toList();
    }

    @Mapping(target = "ageGroups", source = "ageGroups", qualifiedByName = {"mapRaceAgeGroups"})
    RaceWithAgeGroupsAndBoatClassDto toRaceWithAgeGroupsDto(Race paramRace);

    AgeGroupDto toAgeGroupDto(AgeGroup paramAgeGroup);

}