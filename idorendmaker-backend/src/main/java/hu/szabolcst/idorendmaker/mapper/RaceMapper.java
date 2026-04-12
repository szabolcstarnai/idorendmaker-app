package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import hu.szabolcst.idorendmaker.model.entity.catalog.AgeGroup;
import hu.szabolcst.idorendmaker.model.entity.catalog.Race;
import hu.szabolcst.idorendmaker.model.entity.catalog.RaceAgeGroup;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper for the catalog-facing race DTOs. Maps {@link Race} and
 * {@link AgeGroup} from the catalog entities (string-code PKs, no JPA
 * relationships) into their DTO projections.
 *
 * <p>Because the catalog {@code RaceAgeGroup} entity has no managed
 * {@code ageGroup} relation, callers must pre-build a
 * {@code Map<String, AgeGroup>} keyed by age-group code and pass it in
 * alongside the {@code List<RaceAgeGroup>} so this mapper can resolve
 * display names without touching the repository layer itself.
 */
@Mapper
public interface RaceMapper {

    // ------------------------------------------------------------------
    // Catalog-facing API (used by RaceServiceImpl).
    // ------------------------------------------------------------------

    @Mapping(target = "ageGroups", ignore = true)
    RaceWithAgeGroupsAndBoatClassDto toRaceWithAgeGroupsDto(Race paramRace);

    AgeGroupDto toAgeGroupDto(AgeGroup paramAgeGroup);

    /**
     * Stitch a race DTO together with its age groups, resolved via the
     * supplied {@code ageGroupsByCode} lookup map. Unknown age-group codes
     * are skipped silently. Resolved age groups are sorted by
     * {@code sortOrder ASC NULLS LAST, name ASC} so the DTO output is
     * deterministic regardless of the order the {@code raceAgeGroups}
     * join-table list arrives in.
     */
    default RaceWithAgeGroupsAndBoatClassDto toRaceWithAgeGroupsDto(
            final Race paramRace,
            final List<RaceAgeGroup> raceAgeGroups,
            final Map<String, AgeGroup> ageGroupsByCode) {
        final RaceWithAgeGroupsAndBoatClassDto dto = toRaceWithAgeGroupsDto(paramRace);
        if (dto == null) {
            return null;
        }
        if (raceAgeGroups == null || ageGroupsByCode == null) {
            dto.setAgeGroups(List.of());
            return dto;
        }
        dto.setAgeGroups(
            raceAgeGroups.stream()
                .map(rag -> ageGroupsByCode.get(rag.getAgeGroupCode()))
                .filter(Objects::nonNull)
                .sorted(Comparator
                    .comparing(AgeGroup::getSortOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(AgeGroup::getName, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toAgeGroupDto)
                .toList()
        );
        return dto;
    }

}
