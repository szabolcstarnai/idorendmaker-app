import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RaceWithAgeGroupsAndBoatClass, ScheduleWithSections, SectionWorkingData, ScheduleRace, ScheduleSection, Level } from '../../../../shared/types/race';
import { calculateRaceTime, recalculateRaceTimes } from '../utils/scheduleTimeCalculator';
import { DEFAULT_INTERVAL_MINUTES } from '../constants/scheduleConstants';

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
  
  // Current section derived values
  scheduleRaces: ScheduleRace[];
  intervals: number[];
  startTime: string;
  intervalMinutes: number;
  
  // Section settings operations
  setStartTime: (newStartTime: string) => void;
  setIntervalMinutes: (newInterval: number) => void;
  
  // Race operations
  addRaceToSchedule: (race: RaceWithAgeGroupsAndBoatClass, level: Level) => void;
  removeRaceFromSchedule: (id: string) => void;
  moveRace: (fromIndex: number, toIndex: number) => void;
  emptySectionRaces: (sectionId: number) => void;
  
  // Interval operations
  updateInterval: (intervalIndex: number, newMinutes: number) => void;
  recalculateAllTimes: () => void;
  
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
  
  // Current section info
  const currentSection = useMemo(() => {
    return schedule?.sections.find(s => s.id === currentSectionId);
  }, [schedule, currentSectionId]);
  
  // Current section working data
  const currentSectionData = useMemo(() => {
    if (!currentSectionId) return null;
    return sectionDataMap.get(currentSectionId);
  }, [sectionDataMap, currentSectionId]);
  
  // Aggregate races from all sections. Consumers of this value that matter
  // for performance are ScheduleBuilder's debounced rule-violation check and
  // CompetitorTracker's competitor-conflict analysis - both hit the backend,
  // and both re-run whenever this array's *reference* changes.
  //
  // A naive `sectionDataMap.forEach` rebuild (the previous implementation)
  // produces a brand-new array on every `sectionDataMap` change, even one
  // that never touched any section's `races`: `setIntervalMinutes` (the
  // *default* interval used for races added later, not a between-race gap)
  // only replaces a section's `settings` sub-object, and section navigation
  // that revisits an already-initialized section touches nothing at all.
  // Those are pure waste - a new array with the exact same race objects in
  // it, triggering a real rule-check API call and a real competitor-analysis
  // API call for literally nothing.
  //
  // This does NOT go as far as issues #25-#27's "structural vs. display"
  // proposal, which additionally treated *section start time* changes as
  // safe to skip for expensive operations. That is not safe here:
  // RuleProcessor.checkRuleAgainstSchedule (ruleEngine.ts) compares races'
  // absolute `startTime` strings directly, across every section, so a start
  // time change genuinely changes the gaps being checked and must re-run
  // validation - caching around it would mean stale, possibly-wrong
  // violation results after the exact action (nudging a section's start
  // time) an organizer is most likely to make right before race day.
  // Per-section race-array references only change when content that could
  // affect order, codes, levels, or computed times actually changes (see the
  // mutators below and the time-recalculation effect further down), so
  // comparing *those* references is both correct and sufficient.
  const allScheduleRacesCacheRef = useRef<{ sectionRaceArrays: ScheduleRace[][]; result: ScheduleRace[] }>({
    sectionRaceArrays: [],
    result: []
  });
  const allScheduleRaces = useMemo(() => {
    const sectionRaceArrays = Array.from(sectionDataMap.values(), data => data.races);
    const cache = allScheduleRacesCacheRef.current;
    const unchanged =
      sectionRaceArrays.length === cache.sectionRaceArrays.length &&
      sectionRaceArrays.every((races, i) => races === cache.sectionRaceArrays[i]);

    if (unchanged) {
      return cache.result;
    }

    const allRaces: ScheduleRace[] = [];
    sectionRaceArrays.forEach(races => allRaces.push(...races));
    allScheduleRacesCacheRef.current = { sectionRaceArrays, result: allRaces };
    return allRaces;
  }, [sectionDataMap]);

  // Derived values from current section data or defaults
  const scheduleRaces = currentSectionData?.races || [];
  const intervals = currentSectionData?.intervals || [];
  const startTime = currentSectionData?.settings.startTime || currentSection?.startTime || '09:00';
  const intervalMinutes = currentSectionData?.settings.defaultInterval ?? DEFAULT_INTERVAL_MINUTES;

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
          defaultInterval: DEFAULT_INTERVAL_MINUTES
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

  // Sync working data start time with section start time changes.
  //
  // This runs on every section navigation (it depends on `currentSectionId`),
  // which is by far the most common trigger, and in the overwhelming
  // majority of those the working data is already in sync - there's nothing
  // to do. The previous version rebuilt `sectionDataMap` into a fresh `Map`
  // unconditionally, every single time, regardless of whether the inner sync
  // check found anything to change: since a `setState` updater's return
  // value becomes the new state, an always-new `Map` meant *every*
  // navigation between already-visited sections produced a new
  // `sectionDataMap` reference for no reason, cascading into a rebuilt
  // `allScheduleRaces` and - before that fix above - a wasted rule-violation
  // check and competitor-conflict API call on every click through the day
  // navigator. Returning the untouched `prev` when nothing needs syncing is
  // React's documented bail-out: no state update, no re-render.
  useEffect(() => {
    if (!currentSectionId || !currentSection) return;

    setSectionDataMap(prev => {
      const workingData = prev.get(currentSectionId);
      if (!workingData || workingData.settings.startTime === currentSection.startTime) {
        return prev;
      }

      const newMap = new Map(prev);
      newMap.set(currentSectionId, {
        ...workingData,
        settings: {
          ...workingData.settings,
          startTime: currentSection.startTime
        }
      });
      return newMap;
    });
  }, [currentSectionId, currentSection?.startTime]);

  // Section settings setters
  const setStartTime = useCallback((newStartTime: string) => {
    if (!currentSectionId) return;

    setSectionDataMap(prev => {
      const existingData = prev.get(currentSectionId);
      if (existingData && existingData.settings.startTime === newStartTime) {
        return prev;
      }

      const newMap = new Map(prev);

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
            defaultInterval: DEFAULT_INTERVAL_MINUTES
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
      const existingData = prev.get(currentSectionId);
      if (existingData && existingData.settings.defaultInterval === newInterval) {
        return prev;
      }

      const newMap = new Map(prev);

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
  const addRaceToSchedule = useCallback((race: RaceWithAgeGroupsAndBoatClass, level: Level) => {
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
            defaultInterval: DEFAULT_INTERVAL_MINUTES
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
      
      // Generate simple unique ID using race code + level code + counter (stable, no timestamps)
      const newScheduleRace: ScheduleRace = {
        id: `${race.code}-${level.code}-${raceIdCounter}`,
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
      const sectionData = prev.get(currentSectionId);
      if (!sectionData) return prev;

      const updatedRaces = recalculateRaceTimes(
        sectionData.races,
        sectionData.intervals,
        sectionData.settings.startTime
      );

      // recalculateRaceTimes preserves each race's reference when its
      // computed time is unchanged, so an array-length-and-reference check
      // is enough to detect "recalculated to the exact same result" and
      // bail out without touching state - no wasted re-render, and
      // (transitively) no wasted rule-violation check downstream.
      const unchanged =
        updatedRaces.length === sectionData.races.length &&
        updatedRaces.every((race, i) => race === sectionData.races[i]);
      if (unchanged) return prev;

      const newMap = new Map(prev);
      newMap.set(currentSectionId, {
        ...sectionData,
        races: updatedRaces
      });
      return newMap;
    });
  }, [currentSectionId]);

  // Recalculate times when start time changes.
  //
  // This effect's dependencies - `startTime` and `intervals` - are derived
  // from `currentSectionData`, so they change identity on *every* section
  // switch (a different section has a different `intervals` array, even if
  // its values are the same), not just on a genuine start-time edit. That
  // used to mean every navigation between sections unconditionally rewrote
  // the newly-focused section's races with freshly-spread copies via
  // `recalculateRaceTimes` - identical values, new references - which
  // cascaded into `allScheduleRaces` rebuilding and a wasted rule-violation
  // check on every click through the day navigator. `recalculateAllTimes`'s
  // bail-out above is what actually fixes that; this effect still runs on
  // every navigation; it just no longer *does* anything when there's
  // nothing to recalculate.
  useEffect(() => {
    recalculateAllTimes();
  }, [startTime, intervals, recalculateAllTimes]);

  // Populate section data map with loaded data (for loading saved schedules)
  const populateSectionDataMap = useCallback((loadedSectionDataMap: Map<number, SectionWorkingData>) => {
    setSectionDataMap(loadedSectionDataMap);
  }, []);

  return {
    // State
    sectionDataMap,
    currentSection,
    currentSectionData,
    allScheduleRaces,
    
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
    
    // Data population for loading saved schedules
    populateSectionDataMap
  };
};