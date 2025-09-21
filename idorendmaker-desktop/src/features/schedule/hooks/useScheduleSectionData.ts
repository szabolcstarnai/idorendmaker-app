import { useState, useCallback, useMemo, useEffect } from 'react';
import { RaceWithAgeGroups, ScheduleWithSections, SectionWorkingData, ScheduleRace, ScheduleSection, Level } from '../../../../shared/types/race';
import { calculateRaceTime, recalculateRaceTimes } from '../utils/scheduleTimeCalculator';

// Simple hash function for dirty detection
const generateStateHash = (sectionDataMap: Map<number, SectionWorkingData>, scheduleName: string): string => {
  // Create a serializable representation of the complete state
  const stateObject = {
    scheduleName,
    sections: Array.from(sectionDataMap.entries()).map(([id, data]) => ({
      id,
      races: data.races.map(race => ({
        raceId: race.race.id,
        levelId: race.level.id,
        order: race.order
      })),
      intervals: data.intervals,
      settings: data.settings,
      day: data.day
    }))
  };

  // Generate simple hash from JSON string
  const jsonString = JSON.stringify(stateObject);
  let hash = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

interface UseScheduleSectionDataProps {
  schedule?: ScheduleWithSections;
  currentSectionId?: number;
  onSectionStartTimeChange?: (sectionId: number, startTime: string) => void;
}

interface UseScheduleSectionDataReturn {
  // State
  sectionDataMap: Map<number, SectionWorkingData>;
  currentSection: ScheduleSection | undefined;
  currentSectionData: SectionWorkingData | null;
  allScheduleRaces: ScheduleRace[];

  // Hash-based dirty detection
  generateCurrentStateHash: (scheduleName: string) => string;
  savedStateHash: string;

  // Current section derived values
  scheduleRaces: ScheduleRace[];
  intervals: number[];
  startTime: string;
  intervalMinutes: number;

  // Section settings operations
  setStartTime: (newStartTime: string) => void;
  setIntervalMinutes: (newInterval: number) => void;

  // Race operations
  addRaceToSchedule: (race: RaceWithAgeGroups, level: Level) => void;
  removeRaceFromSchedule: (id: string) => void;
  moveRace: (fromIndex: number, toIndex: number) => void;
  emptySectionRaces: (sectionId: number) => void;

  // Interval operations
  updateInterval: (intervalIndex: number, newMinutes: number) => void;
  recalculateAllTimes: () => void;

  // Save state management for dirty tracking
  markSaved: (scheduleName: string) => void;

  // Data population for loading saved schedules
  populateSectionDataMap: (loadedSectionDataMap: Map<number, SectionWorkingData>) => void;
}

/**
 * Custom hook for managing schedule section working data
 * Handles the complex sectionDataMap state and all related operations
 */
export const useScheduleSectionData = ({
  schedule,
  currentSectionId,
  onSectionStartTimeChange
}: UseScheduleSectionDataProps): UseScheduleSectionDataReturn => {
  
  // Multi-section working data architecture
  const [sectionDataMap, setSectionDataMap] = useState<Map<number, SectionWorkingData>>(new Map());

  // Simple counter for generating unique IDs (instead of timestamps)
  const [raceIdCounter, setRaceIdCounter] = useState(1);

  // Hash-based dirty detection
  const [savedStateHash, setSavedStateHash] = useState<string>('');
  
  // Current section info
  const currentSection = useMemo(() => {
    return schedule?.sections.find(s => s.id === currentSectionId);
  }, [schedule, currentSectionId]);
  
  // Current section working data
  const currentSectionData = useMemo(() => {
    if (!currentSectionId) return null;
    return sectionDataMap.get(currentSectionId);
  }, [sectionDataMap, currentSectionId]);
  
  // Aggregate races from all sections for RaceList tab filtering
  const allScheduleRaces = useMemo(() => {
    console.log('Recalculating allScheduleRaces from sectionDataMap');
    console.log('Current sectionDataMap:', sectionDataMap);
    const allRaces: ScheduleRace[] = [];
    sectionDataMap.forEach(sectionData => {
      allRaces.push(...sectionData.races);
    });
    console.log('All schedule races:', allRaces);
    return allRaces;
  }, [sectionDataMap]);

  // Generate current state hash - will be compared with ScheduleBuilder's scheduleName
  const generateCurrentStateHash = useCallback((scheduleName: string) => {
    return generateStateHash(sectionDataMap, scheduleName);
  }, [sectionDataMap]);

  // For now, we'll calculate current hash in the return object since we need scheduleName from ScheduleBuilder
  // The actual dirty detection will be done in ScheduleBuilder using this function

  // Derived values from current section data or defaults
  const scheduleRaces = currentSectionData?.races || [];
  const intervals = currentSectionData?.intervals || [];
  const startTime = currentSectionData?.settings.startTime || currentSection?.startTime || '09:00';
  const intervalMinutes = currentSectionData?.settings.defaultInterval || 15;

  // Initialize section data when section changes or is accessed for the first time
  useEffect(() => {
    if (currentSectionId && currentSection && !sectionDataMap.has(currentSectionId)) {
      // Initialize empty section data for new sections
      const newSectionData: SectionWorkingData = {
        sectionId: currentSectionId,
        races: [],
        intervals: [],
        settings: {
          startTime: currentSection.startTime,
          defaultInterval: 15
        },
        day: currentSection.dayNumber
      };
      
      setSectionDataMap(prev => {
        const newMap = new Map(prev);
        newMap.set(currentSectionId, newSectionData);
        return newMap;
      });
    }
  }, [currentSectionId, currentSection, sectionDataMap]);

  // Section settings setters
  const setStartTime = useCallback((newStartTime: string) => {
    if (!currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const existingData = newMap.get(currentSectionId);
      
      if (existingData) {
        newMap.set(currentSectionId, {
          ...existingData,
          settings: {
            ...existingData.settings,
            startTime: newStartTime
          }
        });
      } else {
        // Initialize section data if it doesn't exist
        newMap.set(currentSectionId, {
          sectionId: currentSectionId,
          races: [],
          intervals: [],
          settings: {
            startTime: newStartTime,
            defaultInterval: 15
          },
          day: currentSection?.dayNumber || 1
        });
      }
      
      return newMap;
    });
    
    // Also notify parent component if callback exists
    if (onSectionStartTimeChange) {
      onSectionStartTimeChange(currentSectionId, newStartTime);
    }
  }, [currentSectionId, onSectionStartTimeChange]);

  const setIntervalMinutes = useCallback((newInterval: number) => {
    if (!currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const existingData = newMap.get(currentSectionId);
      
      if (existingData) {
        newMap.set(currentSectionId, {
          ...existingData,
          settings: {
            ...existingData.settings,
            defaultInterval: newInterval
          }
        });
      } else {
        // Initialize section data if it doesn't exist
        newMap.set(currentSectionId, {
          sectionId: currentSectionId,
          races: [],
          intervals: [],
          settings: {
            startTime: currentSection?.startTime || '09:00',
            defaultInterval: newInterval
          },
          day: currentSection?.dayNumber || 1
        });
      }
      
      return newMap;
    });
  }, [currentSectionId, currentSection]);

  // Race operations
  const addRaceToSchedule = useCallback((race: RaceWithAgeGroups, level: Level) => {
    if (!currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const existingData = newMap.get(currentSectionId);
      
      // Initialize section data if it doesn't exist
      if (!existingData) {
        // Get section info from schedule to avoid currentSection dependency
        const section = schedule?.sections.find(s => s.id === currentSectionId);
        const newSectionData: SectionWorkingData = {
          sectionId: currentSectionId,
          races: [],
          intervals: [],
          settings: {
            startTime: section?.startTime || '09:00',
            defaultInterval: 15
          },
          day: section?.dayNumber || 1
        };
        newMap.set(currentSectionId, newSectionData);
      }
      
      const sectionData = newMap.get(currentSectionId)!;
      const newOrder = sectionData.races.length;
      
      // Update intervals array if this isn't the first race
      let updatedIntervals = sectionData.intervals;
      if (newOrder > 0) {
        updatedIntervals = [...sectionData.intervals, sectionData.settings.defaultInterval];
      }
      
      // Calculate start time using updated intervals
      const newStartTime = calculateRaceTime(newOrder, updatedIntervals, sectionData.settings.startTime);
      
      // Generate simple unique ID using race ID + level ID + counter (stable, no timestamps)
      const newScheduleRace: ScheduleRace = {
        id: `${race.id}-${level.id}-${raceIdCounter}`,
        race,
        level,
        startTime: newStartTime,
        order: newOrder,
        day: sectionData.day
      };

      // Update section data with new race and intervals
      newMap.set(currentSectionId, {
        ...sectionData,
        races: [...sectionData.races, newScheduleRace],
        intervals: updatedIntervals
      });

      return newMap;
    });

    // Increment counter for next race
    setRaceIdCounter(prev => prev + 1);
  }, [currentSectionId, schedule, raceIdCounter]);

  const removeRaceFromSchedule = useCallback((id: string) => {
    if (!currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const sectionData = newMap.get(currentSectionId);
      
      if (!sectionData) return newMap;
      
      const raceIndex = sectionData.races.findIndex(sr => sr.id === id);
      if (raceIndex === -1) return newMap;
      
      const filteredRaces = sectionData.races.filter(sr => sr.id !== id);
      
      // Update intervals array - remove interval after the deleted race
      const newIntervals = [...sectionData.intervals];
      if (raceIndex < newIntervals.length) {
        newIntervals.splice(raceIndex, 1);
      }
      
      // Recalculate times for remaining races using intervals
      const updatedRaces = recalculateRaceTimes(
        filteredRaces.map((sr, index) => ({ ...sr, order: index })),
        newIntervals,
        sectionData.settings.startTime
      );

      newMap.set(currentSectionId, {
        ...sectionData,
        races: updatedRaces,
        intervals: newIntervals
      });

      return newMap;
    });

  }, [currentSectionId]);

  const emptySectionRaces = useCallback((sectionId: number) => {
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const sectionData = newMap.get(sectionId);
      
      if (!sectionData) return newMap;
      
      // Clear all races and intervals, but keep the section structure and settings
      newMap.set(sectionId, {
        ...sectionData,
        races: [],
        intervals: []
      });

      return newMap;
    });

  }, []);

  const moveRace = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const sectionData = newMap.get(currentSectionId);
      
      if (!sectionData) return newMap;
      
      const newScheduleRaces = [...sectionData.races];
      const [movedRace] = newScheduleRaces.splice(fromIndex, 1);
      newScheduleRaces.splice(toIndex, 0, movedRace);
      
      // Also rearrange intervals array - intervals move with their "position"
      const newIntervals = [...sectionData.intervals];
      if (fromIndex < newIntervals.length && toIndex < newIntervals.length) {
        const [movedInterval] = newIntervals.splice(fromIndex, 1);
        newIntervals.splice(toIndex, 0, movedInterval);
      }
      
      // Recalculate times and orders using intervals array
      const updatedRaces = recalculateRaceTimes(
        newScheduleRaces.map((sr, index) => ({ ...sr, order: index })),
        newIntervals,
        sectionData.settings.startTime
      );

      newMap.set(currentSectionId, {
        ...sectionData,
        races: updatedRaces,
        intervals: newIntervals
      });

      return newMap;
    });

  }, [currentSectionId]);

  // Interval operations
  const updateInterval = useCallback((intervalIndex: number, newMinutes: number) => {
    if (!currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const sectionData = newMap.get(currentSectionId);
      
      if (!sectionData) return newMap;
      
      const newIntervals = [...sectionData.intervals];
      newIntervals[intervalIndex] = newMinutes;
      
      // Recalculate all times with updated intervals immediately
      const updatedRaces = recalculateRaceTimes(
        sectionData.races,
        newIntervals,
        sectionData.settings.startTime
      );
      
      newMap.set(currentSectionId, {
        ...sectionData,
        races: updatedRaces,
        intervals: newIntervals
      });

      return newMap;
    });

  }, [currentSectionId]);

  const recalculateAllTimes = useCallback(() => {
    if (!currentSectionId) return;
    
    setSectionDataMap(prev => {
      const newMap = new Map(prev);
      const sectionData = newMap.get(currentSectionId);
      
      if (!sectionData) return newMap;
      
      const updatedRaces = recalculateRaceTimes(
        sectionData.races,
        sectionData.intervals,
        sectionData.settings.startTime
      );
      
      newMap.set(currentSectionId, {
        ...sectionData,
        races: updatedRaces
      });
      
      return newMap;
    });
  }, [currentSectionId]);

  // Recalculate times when start time changes
  useEffect(() => {
    recalculateAllTimes();
  }, [startTime, intervals, recalculateAllTimes]);

  // Populate section data map with loaded data (for loading saved schedules)
  const populateSectionDataMap = useCallback((loadedSectionDataMap: Map<number, SectionWorkingData>) => {
    setSectionDataMap(loadedSectionDataMap);
  }, []);

  // Mark as saved - store current state hash
  const markSaved = useCallback((scheduleName: string) => {
    const currentHash = generateStateHash(sectionDataMap, scheduleName);
    setSavedStateHash(currentHash);
  }, [sectionDataMap]);

  return {
    // State
    sectionDataMap,
    currentSection,
    currentSectionData,
    allScheduleRaces,

    // Hash-based dirty detection (Note: currentStateHash will be calculated in ScheduleBuilder with scheduleName)
    generateCurrentStateHash,
    savedStateHash,

    // Current section derived values
    scheduleRaces,
    intervals,
    startTime,
    intervalMinutes,

    // Section settings operations
    setStartTime,
    setIntervalMinutes,

    // Race operations
    addRaceToSchedule,
    removeRaceFromSchedule,
    moveRace,
    emptySectionRaces,

    // Interval operations
    updateInterval,
    recalculateAllTimes,

    // Save state management for dirty tracking
    markSaved,

    // Data population for loading saved schedules
    populateSectionDataMap
  };
};