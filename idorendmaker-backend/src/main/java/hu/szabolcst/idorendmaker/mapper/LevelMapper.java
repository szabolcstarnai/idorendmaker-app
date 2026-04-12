package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.entity.catalog.Level;
import org.mapstruct.Mapper;

/**
 * Mapper for the catalog-facing level DTOs. Maps {@link Level} from the
 * catalog entity (string-code PK) into its DTO projection.
 */
@Mapper
public interface LevelMapper {

    LevelDto toDto(Level paramLevel);
}
