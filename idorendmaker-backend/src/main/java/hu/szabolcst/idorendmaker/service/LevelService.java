package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.level.LevelDto;
import java.util.List;
import java.util.Optional;

public interface LevelService {

	/**
	 * Get all levels ordered by sort order
	 * Equivalent to TypeScript: getAllLevels(): Promise<Level[]>
	 */
	List<LevelDto> getAllLevels();

	/**
	 * Get the default level (Döntő I.)
	 * Equivalent to TypeScript: getDefaultLevel(): Promise<Level>
	 * Throws exception if default level not found
	 */
	LevelDto getDefaultLevel();

	/**
	 * Get level by ID
	 * Equivalent to TypeScript: getLevelById(id: number): Promise<Level | null>
	 * TODO: DEAD CODE - Not exposed via IPC, consider removal
	 */
	Optional<LevelDto> getLevelById(Integer id);

	/**
	 * Get levels by type
	 * Equivalent to TypeScript: getLevelsByType(levelType: string): Promise<Level[]>
	 * TODO: DEAD CODE - Not exposed via IPC, consider removal
	 */
	List<LevelDto> getLevelsByType(String levelType);

}
