import { RaceWithAgeGroupsAndBoatClass, Level, ScheduleRace, ScheduleMode } from '../../shared/types/race';

/**
 * Utility functions for level management and filtering
 */

/**
 * Get available levels for a specific race
 * Returns levels that haven't been used for this race in the current schedule
 */
export const getAvailableLevels = (
  race: RaceWithAgeGroupsAndBoatClass,
  scheduleRaces: ScheduleRace[],
  allLevels: Level[]
): Level[] => {
  // Get levels already used for this specific race
  const usedLevelCodes = new Set(
    scheduleRaces
      .filter(sr => sr.race.code === race.code)
      .map(sr => sr.level.code)
  );

  // Return levels not yet used for this race
  return allLevels.filter(level => !usedLevelCodes.has(level.code));
};

/**
 * Get available levels for a specific race based on schedule mode
 * In simplified mode, only returns the default level if not already used
 * In full mode, returns all unused levels
 */
export const getAvailableLevelsForMode = (
  race: RaceWithAgeGroupsAndBoatClass,
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
  race: RaceWithAgeGroupsAndBoatClass,
  scheduleRaces: ScheduleRace[]
): Level[] => {
  return scheduleRaces
    .filter(sr => sr.race.code === race.code)
    .map(sr => sr.level);
};

/**
 * Generate race+level combination key for tracking purposes
 */
export const getRaceLevelKey = (raceCode: string, levelCode: string): string => {
  return `${raceCode}-${levelCode}`;
};

/**
 * Check if a specific race+level combination exists in schedule
 */
export const hasRaceLevelCombination = (
  raceCode: string,
  levelCode: string,
  scheduleRaces: ScheduleRace[]
): boolean => {
  return scheduleRaces.some(sr => sr.race.code === raceCode && sr.level.code === levelCode);
};

/**
 * Get all race+level combinations currently in schedule
 */
export const getRaceLevelCombinations = (scheduleRaces: ScheduleRace[]): Set<string> => {
  return new Set(
    scheduleRaces.map(sr => getRaceLevelKey(sr.race.code, sr.level.code))
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
