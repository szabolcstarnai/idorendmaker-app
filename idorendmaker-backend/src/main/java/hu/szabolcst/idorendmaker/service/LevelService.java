package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import java.util.List;
import java.util.Optional;

public interface LevelService {

	/**
	 * Get all levels ordered by sort order.
	 */
	List<LevelDto> getAllLevels();

	/**
	 * Get the default level (Döntő I.).
	 */
	LevelDto getDefaultLevel();

	/**
	 * Get level by catalog {@code code}.
	 */
	Optional<LevelDto> getLevelByCode(String code);

	/**
	 * Get levels by type.
	 */
	List<LevelDto> getLevelsByType(String levelType);

}
