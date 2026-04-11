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
import org.mapstruct.Named;

/**
 * Mapper for the catalog-facing race DTOs. Maps {@link Race} and
 * {@link AgeGroup} from the new catalog entities (string-code PKs, no JPA
 * relationships) into their DTO projections.
 *
 * <p>Because the catalog {@code RaceAgeGroup} entity has no managed
 * {@code ageGroup} relation, callers must pre-build a
 * {@code Map<String, AgeGroup>} keyed by age-group code and pass it in
 * alongside the {@code List<RaceAgeGroup>} so this mapper can resolve
 * display names without touching the repository layer itself.
 *
 * <p>Legacy overloads (taking entities from {@code model.entity.*}) are
 * retained purely so MapStruct-generated classes for
 * {@link ScheduleMapper} and {@link RaceMatchingMapper} — which still use
 * the legacy user entities through JPA relationships on
 * {@code ScheduleItem} and {@code PDFExtraction}'s matched races — keep
 * compiling until Phase 4b rewrites those services. Runtime output of
 * those legacy overloads produces DTOs with {@code code == null}; that is
 * intentional and known to be broken at runtime until Phase 4b.
 */
@Mapper
public interface RaceMapper {

    // ------------------------------------------------------------------
    // Catalog-facing API (used by RaceServiceImpl).
    // ------------------------------------------------------------------

    @Mapping(target = "ageGroups", ignore = true)
    @Mapping(target = "id", ignore = true)
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

    // ------------------------------------------------------------------
    // Legacy overloads (transitional — remove in Phase 4b).
    //
    // These exist only so the MapStruct-generated ScheduleMapperImpl and
    // RaceMatchingMapperImpl still compile. They are NOT wired into any
    // live catalog request path after Phase 4a: RaceServiceImpl now uses
    // the catalog entities above. The legacy user services that still
    // depend on these methods will be rewritten in Phase 4b.
    // ------------------------------------------------------------------

    // TODO(Phase 4b): delete this legacy overload together with ScheduleMapper/RaceMatchingMapper rewrites.
    @Named("mapRaceAgeGroups")
    default List<AgeGroupDto> mapRaceAgeGroupsToAgeGroupDtos(
            final List<hu.szabolcst.idorendmaker.model.entity.RaceAgeGroup> raceAgeGroups) {
        if (raceAgeGroups == null) {
            return null;
        }
        return raceAgeGroups.stream()
            .map(rag -> toAgeGroupDto(rag.getAgeGroup()))
            .toList();
    }

    // TODO(Phase 4b): delete this legacy overload together with ScheduleMapper/RaceMatchingMapper rewrites.
    @Mapping(target = "ageGroups", source = "ageGroups", qualifiedByName = {"mapRaceAgeGroups"})
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "boatClassCode", ignore = true)
    @Mapping(target = "sortOrder", ignore = true)
    RaceWithAgeGroupsAndBoatClassDto toRaceWithAgeGroupsDto(
        hu.szabolcst.idorendmaker.model.entity.Race paramRace);

    // TODO(Phase 4b): delete this legacy overload together with ScheduleMapper/RaceMatchingMapper rewrites.
    @Mapping(target = "code", ignore = true)
    @Mapping(target = "sortOrder", ignore = true)
    AgeGroupDto toAgeGroupDto(hu.szabolcst.idorendmaker.model.entity.AgeGroup paramAgeGroup);

}
