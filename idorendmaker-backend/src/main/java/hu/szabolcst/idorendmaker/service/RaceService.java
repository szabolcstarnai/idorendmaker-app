package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public interface RaceService {

	/**
	 * Get all races with their age groups, ordered by occurrence and name
	 * Equivalent to TypeScript: getAllRaces(): Promise<RaceWithAgeGroups[]>
	 */
	List<RaceWithAgeGroupsDto> getAllRaces();

	/**
	 * Search races by term across multiple fields including age groups
	 * Equivalent to TypeScript: searchRaces(searchTerm: string): Promise<RaceWithAgeGroups[]>
	 */
	List<RaceWithAgeGroupsDto> searchRaces(String searchTerm);

	/**
	 * Update race visibility (hidden status)
	 * Equivalent to TypeScript: updateRaceHidden(raceId: number, hidden: boolean): Promise<boolean>
	 */
	boolean updateRaceHidden(Integer raceId, boolean hidden);

	/**
	 * Get all age groups ordered by name
	 * Equivalent to TypeScript: getAllAgeGroups(): Promise<{id: number, name: string, createdAt: Date}[]>
	 */
	List<AgeGroupDto> getAllAgeGroups();

	/**
	 * Get statistics about the database
	 * Equivalent to TypeScript: getStats(): Promise<{races: number, ageGroups: number, schedules: number}>
	 */
	DatabaseStatsDto getStats();

}
