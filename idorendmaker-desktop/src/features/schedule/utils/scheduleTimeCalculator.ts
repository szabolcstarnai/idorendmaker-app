/**
 * Schedule Time Calculator Utility
 * 
 * Pure functions for time calculations in schedule building.
 */

/**
 * Convert time string (HH:MM) to total minutes
 */
export const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert total minutes to time string (HH:MM)
 */
export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculate race start time using intervals array
 * Formula: sectionStartTime + sum(intervals[0...raceIndex-1])
 */
export const calculateRaceTime = (
  raceIndex: number, 
  intervals: number[], 
  sectionStartTime: string
): string => {
  if (raceIndex === 0) return sectionStartTime;
  
  let totalMinutes = timeToMinutes(sectionStartTime);
  
  // Add up all intervals before this race
  for (let i = 0; i < raceIndex; i++) {
    totalMinutes += intervals[i] || 0;
  }
  
  return minutesToTime(totalMinutes);
};

/**
 * Format interval in (+ HH:MM) format for display between races
 */
export const formatInterval = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `+ ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculate total schedule duration from start time to last race time
 */
export const calculateTotalDuration = (
  startTime: string, 
  lastRaceTime: string,
  hungarianStrings: { hours: string; minutes: string }
): string => {
  if (!lastRaceTime) return '0 perc';
  
  const startTotalMin = timeToMinutes(startTime);
  const endTotalMin = timeToMinutes(lastRaceTime);
  const duration = endTotalMin - startTotalMin;
  
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours > 0) {
    if (minutes === 0) {
      return `${hours} ${hungarianStrings.hours}`;
    }
    return `${hours} ${hungarianStrings.hours} ${minutes} ${hungarianStrings.minutes}`;
  }
  return `${minutes} ${hungarianStrings.minutes}`;
};

/**
 * Recalculate all race times in a schedule using updated intervals
 */
export const recalculateRaceTimes = <T extends { startTime: string }>(
  races: T[],
  intervals: number[],
  sectionStartTime: string
): T[] => {
  return races.map((race, index) => ({
    ...race,
    startTime: calculateRaceTime(index, intervals, sectionStartTime)
  }));
};