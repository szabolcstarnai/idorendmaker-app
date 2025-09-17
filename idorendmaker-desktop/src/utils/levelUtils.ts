import { RaceWithAgeGroups, Level, ScheduleRace, ScheduleMode } from '../../shared/types/race';

/**
 * Utility functions for level management and filtering
 */

/**
 * Get available levels for a specific race
 * Returns levels that haven't been used for this race in the current schedule
 */
export const getAvailableLevels = (
  race: RaceWithAgeGroups,
  scheduleRaces: ScheduleRace[],
  allLevels: Level[]
): Level[] => {
  // Get levels already used for this specific race
  const usedLevelIds = new Set(
    scheduleRaces
      .filter(sr => sr.race.id === race.id)
      .map(sr => sr.level.id)
  );

  // Return levels not yet used for this race
  return allLevels.filter(level => !usedLevelIds.has(level.id));
};

/**
 * Get available levels for a specific race based on schedule mode
 * In simplified mode, only returns the default level if not already used
 * In full mode, returns all unused levels
 */
export const getAvailableLevelsForMode = (
  race: RaceWithAgeGroups,
  scheduleRaces: ScheduleRace[],
  allLevels: Level[],
  mode: ScheduleMode
): Level[] => {
  const availableLevels = getAvailableLevels(race, scheduleRaces, allLevels);
  
  if (mode === 'simplified') {
    // In simplified mode, only return the default level if available
    return availableLevels.filter(level => level.isDefault);
  }
  
  // In full mode, return all available levels
  return availableLevels;
};

/**
 * Get levels already added for a specific race
 */
export const getAddedLevels = (
  race: RaceWithAgeGroups,
  scheduleRaces: ScheduleRace[]
): Level[] => {
  return scheduleRaces
    .filter(sr => sr.race.id === race.id)
    .map(sr => sr.level);
};

/**
 * Generate race+level combination key for tracking purposes
 */
export const getRaceLevelKey = (raceId: number, levelId: number): string => {
  return `${raceId}-${levelId}`;
};

/**
 * Check if a specific race+level combination exists in schedule
 */
export const hasRaceLevelCombination = (
  raceId: number,
  levelId: number,
  scheduleRaces: ScheduleRace[]
): boolean => {
  return scheduleRaces.some(sr => sr.race.id === raceId && sr.level.id === levelId);
};

/**
 * Get all race+level combinations currently in schedule
 */
export const getRaceLevelCombinations = (scheduleRaces: ScheduleRace[]): Set<string> => {
  return new Set(
    scheduleRaces.map(sr => getRaceLevelKey(sr.race.id, sr.level.id))
  );
};

/**
 * Group levels by type for organized display
 */
export const groupLevelsByType = (levels: Level[]): Record<string, Level[]> => {
  return levels.reduce((groups, level) => {
    const type = level.levelType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(level);
    return groups;
  }, {} as Record<string, Level[]>);
};

/**
 * Get display label for level type
 */
export const getLevelTypeLabel = (levelType: string): string => {
  switch (levelType) {
    case 'döntő': return 'Döntő';
    case 'előfutam': return 'Előfutam';
    case 'középfutam': return 'Középfutam';
    default: return levelType;
  }
};

/**
 * Get color class for level type badges
 */
export const getLevelTypeColor = (levelType: string): string => {
  switch (levelType) {
    case 'döntő': return 'bg-blue-100 text-blue-800';
    case 'előfutam': return 'bg-green-100 text-green-800';
    case 'középfutam': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};