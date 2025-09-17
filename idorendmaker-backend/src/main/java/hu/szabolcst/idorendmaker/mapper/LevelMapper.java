package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import hu.szabolcst.idorendmaker.model.entity.Level;
import org.mapstruct.Mapper;

@Mapper
public interface LevelMapper {

    LevelDto toDto(Level paramLevel);
}
