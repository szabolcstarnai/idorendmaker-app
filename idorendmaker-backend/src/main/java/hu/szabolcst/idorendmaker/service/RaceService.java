package hu.szabolcst.idorendmaker.service;

import hu.szabolcst.idorendmaker.model.dto.DatabaseStatsDto;
import hu.szabolcst.idorendmaker.model.dto.race.AgeGroupDto;
import hu.szabolcst.idorendmaker.model.dto.race.RaceWithAgeGroupsAndBoatClassDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public interface RaceService {

	/**
	 * Get all races with their age groups, ordered by {@code sortOrder} then {@code name}.
	 */
	List<RaceWithAgeGroupsAndBoatClassDto> getAllRaces();

	/**
	 * Search races by term across the scalar fields (name / discipline /
	 * gender / distance / boatClassCode).
	 */
	List<RaceWithAgeGroupsAndBoatClassDto> searchRaces(String searchTerm);

	/**
	 * Get all age groups ordered by name.
	 */
	List<AgeGroupDto> getAllAgeGroups();

	/**
	 * Get statistics about the database.
	 */
	DatabaseStatsDto getStats();

}
