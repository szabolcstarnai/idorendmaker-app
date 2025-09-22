package hu.szabolcst.idorendmaker.mapper;

import hu.szabolcst.idorendmaker.model.dto.boatclass.BoatClassDto;
import hu.szabolcst.idorendmaker.model.entity.BoatClass;
import org.mapstruct.Mapper;

@Mapper
public interface BoatClassMapper {

    BoatClassDto toDto(BoatClass boatClass);
}