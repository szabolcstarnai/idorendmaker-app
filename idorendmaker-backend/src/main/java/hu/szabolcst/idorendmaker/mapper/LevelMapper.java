package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.entity.catalog.Level;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper for the catalog-facing level DTOs. Maps {@link Level} from the
 * new catalog entity (string-code PK) into its DTO projection.
 *
 * <p>A legacy overload (taking {@code model.entity.Level}) is retained
 * purely so the MapStruct-generated {@code ScheduleMapperImpl} still
 * compiles — ScheduleMapper declares {@code uses = {LevelMapper.class}}
 * and maps {@code ScheduleItem.level} (still a legacy {@code @ManyToOne})
 * through it. Phase 4b rewrites ScheduleMapper and this overload goes
 * away with it. The runtime output of the legacy overload produces DTOs
 * with {@code code == null}; that is intentional until Phase 4b.
 */
@Mapper
public interface LevelMapper {

    @Mapping(target = "id", ignore = true)
    LevelDto toDto(Level paramLevel);

    // TODO(Phase 4b): delete this legacy overload together with the ScheduleMapper rewrite.
    @Mapping(target = "code", ignore = true)
    LevelDto toDto(hu.szabolcst.idorendmaker.model.entity.Level paramLevel);
}
