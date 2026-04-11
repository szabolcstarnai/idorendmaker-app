package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.entity.catalog.Level;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper for the catalog-facing level DTOs. Maps {@link Level} from the
 * new catalog entity (string-code PK) into its DTO projection.
 *
 * <p>A legacy overload taking {@code model.entity.Level} is retained
 * temporarily so callers not yet migrated to the catalog entity still
 * compile. It emits DTOs with {@code code == null} and is removed in
 * Phase 4b-3 when the legacy {@code Level} entity is deleted.
 */
@Mapper
public interface LevelMapper {

    @Mapping(target = "id", ignore = true)
    LevelDto toDto(Level paramLevel);

    // TODO(Phase 4b): delete this legacy overload together with the ScheduleMapper rewrite.
    @Mapping(target = "code", ignore = true)
    LevelDto toDto(hu.szabolcst.idorendmaker.model.entity.Level paramLevel);
}
