import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { RaceWithAgeGroups, ScheduleWithSections, SectionWorkingData, ScheduleRace, RuleViolation, Level, ScheduleMode } from '../../../shared/types/race';
import SectionNavigator from './SectionNavigator';
import CombinedSettingsPanel from './CombinedSettingsPanel';
import ScheduleRaceList from './ScheduleRaceList';
import RuleViolationDisplay from '../rules/RuleViolationDisplay';
import CompetitorTracker from '../pdf/CompetitorTracker';
import { useScheduleSectionData } from '../../features/schedule/hooks/useScheduleSectionData';
import { useSaveSchedule } from '../../features/schedule/hooks/useSaveSchedule';
import { calculateTotalDuration, formatInterval } from '../../features/schedule/utils/scheduleTimeCalculator';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface ScheduleBuilderProps {
  onScheduleRacesChange?: (races: ScheduleRace[]) => void;
  onRaceAddRefUpdate?: (fn: (race: RaceWithAgeGroups, level: Level) => void) => void;
  onPopulateSectionDataRefUpdate?: (fn: (loadedSectionDataMap: Map<number, SectionWorkingData>) => void) => void;
  schedule?: ScheduleWithSections;
  currentSectionId?: number;
  onSectionChange?: (sectionId: number) => void;
  onSectionAdd?: (sectionData: { scheduleId: number, dayNumber: number, sectionType: 'délelőtt' | 'délután', startTime: string }) => void;
  onSectionRemove?: (sectionId: number) => void;
  onSectionStartTimeChange?: (sectionId: number, startTime: string) => void;
  onScheduleSave?: (schedule: ScheduleWithSections, scheduleName: string, sectionData: Map<number, SectionWorkingData>, pdfExtractionId?: number) => void;
  scheduleMode?: ScheduleMode;
  // New props for PDF-to-schedule integration
  pdfExtractionId?: number; // When coming from PDF workflow, enables competitor-aware features
  competitorData?: Record<string, any>; // Competitor information for smart rule checking
  // Unsaved changes tracking
  onUnsavedChanges?: (hasChanges: boolean, type?: 'schedule' | 'rule', saveFunction?: () => Promise<void> | void, canSave?: boolean) => void;
}

// Hungarian strings for duration calculation
const hungarianStrings = {
  hours: 'óra',
  minutes: 'perc'
};

const ScheduleBuilder: React.FC<ScheduleBuilderProps> = React.memo(({ 
  onScheduleRacesChange,
  onRaceAddRefUpdate,
  onPopulateSectionDataRefUpdate,
  schedule,
  currentSectionId,
  onSectionChange,
  onSectionAdd,
  onSectionRemove,
  onSectionStartTimeChange,
  onScheduleSave,
  scheduleMode = 'full',
  pdfExtractionId,
  competitorData,
  onUnsavedChanges
}) => {
  const [scheduleName, setScheduleName] = useState('Új időrend');
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [checkingRules, setCheckingRules] = useState(false);
  const [showViolations, setShowViolations] = useState(true);
  const [highlightedRaceIds, setHighlightedRaceIds] = useState<string[]>([]);
  const [dismissedViolationHashes, setDismissedViolationHashes] = useState<string[]>([]);
  const [dismissedCount, setDismissedCount] = useState<number>(0);
  const [saveTimestamp, setSaveTimestamp] = useState<number>(0);

  // Use custom hooks for complex logic
  const sectionDataHook = useScheduleSectionData({
    schedule,
    currentSectionId,
    onSectionStartTimeChange
  });

  const {
    sectionDataMap,
    allScheduleRaces,
    scheduleRaces,
    intervals,
    startTime,
    intervalMinutes,
    setStartTime,
    setIntervalMinutes,
    addRaceToSchedule,
    removeRaceFromSchedule,
    moveRace,
    emptySectionRaces,
    updateInterval,
    populateSectionDataMap
  } = sectionDataHook;

  const { saveSchedule, canSave } = useSaveSchedule({
    schedule,
    sectionDataMap,
    scheduleName,
    pdfExtractionId,
    onScheduleSave,
    onSaveSuccess: () => {
      // Clear unsaved changes state immediately after successful save
      setSaveTimestamp(Date.now());
    }
  });

  // Initialize schedule name from schedule
  useEffect(() => {
    if (schedule) {
      setScheduleName(schedule.name);
    }
  }, [schedule, schedule?.name]);


  // Notify parent component of aggregate schedule changes from all sections
  useEffect(() => {
    if (onScheduleRacesChange) {
      onScheduleRacesChange(allScheduleRaces);
    }
  }, [allScheduleRaces, onScheduleRacesChange]);

  // Provide addRaceToSchedule function to parent component (now level-aware)
  useEffect(() => {
    if (onRaceAddRefUpdate) {
      onRaceAddRefUpdate(addRaceToSchedule);
    }
  }, [onRaceAddRefUpdate, addRaceToSchedule]);

  // Provide populateSectionDataMap function to parent component for loading saved schedules
  useEffect(() => {
    if (onPopulateSectionDataRefUpdate) {
      onPopulateSectionDataRefUpdate(populateSectionDataMap);
    }
  }, [onPopulateSectionDataRefUpdate, populateSectionDataMap]);

  // Load dismissed violations when schedule changes
  useEffect(() => {
    const loadDismissedViolations = async () => {
      if (schedule && schedule.id > 0) {
        try {
          const dismissed = await window.electronAPI.getDismissedViolations(schedule.id);
          const count = await window.electronAPI.getDismissedViolationCount(schedule.id);
          setDismissedViolationHashes(dismissed);
          setDismissedCount(count);
        } catch (error) {
          console.error('Error loading dismissed violations:', error);
          setDismissedViolationHashes([]);
          setDismissedCount(0);
        }
      } else {
        setDismissedViolationHashes([]);
        setDismissedCount(0);
      }
    };

    loadDismissedViolations();
  }, [schedule?.id]);

  // Track unsaved changes - use memo to calculate changes and prevent infinite loops  
  const hasUnsavedChanges = useMemo(() => {
    // If we just saved (timestamp changed), no unsaved changes for a moment
    if (saveTimestamp > 0 && Date.now() - saveTimestamp < 1000) {
      return false;
    }
    
    // Determine if there are changes by checking:
    // 1. If there are races in any section
    // 2. If the schedule name has changed from the original
    const hasRaces = sectionDataMap.size > 0 && Array.from(sectionDataMap.values()).some(data => data.races.length > 0);
    const hasNameChange = schedule && scheduleName !== schedule.name;
    return hasRaces || hasNameChange;
  }, [sectionDataMap, scheduleName, schedule?.name, saveTimestamp]);
  
  // Only notify when unsaved changes state actually changes
  const previousChangesRef = useRef<boolean>(false);
  useEffect(() => {
    if (!onUnsavedChanges) return;
    
    if (hasUnsavedChanges !== previousChangesRef.current) {
      previousChangesRef.current = hasUnsavedChanges;
      
      if (hasUnsavedChanges) {
        onUnsavedChanges(true, 'schedule', saveSchedule, canSave);
      } else {
        onUnsavedChanges(false);
      }
    }
  }, [hasUnsavedChanges]); // Only depend on the memoized boolean

  // Rule violation checking with debouncing - enhanced for competitor awareness
  const checkRuleViolations = useCallback(async (racesToCheck: ScheduleRace[]) => {
    if (racesToCheck.length < 2) {
      setViolations([]);
      return;
    }

    setCheckingRules(true);
    try {
      // Use competitor-aware rule checking if we have PDF extraction data
      const allViolations = pdfExtractionId 
        ? await window.electronAPI.checkScheduleViolationsWithCompetitors(racesToCheck, pdfExtractionId)
        : await window.electronAPI.checkScheduleViolations(racesToCheck);
        
      // Filter out dismissed violations
      const visibleViolations = allViolations.filter(violation => 
        !dismissedViolationHashes.includes(violation.violationHash)
      );
      setViolations(visibleViolations);
      
      // Log competitor-aware information if available
      if (pdfExtractionId && allViolations.length > 0) {
        const competitorViolations = allViolations.filter((v: any) => v.competitorOverlap);
        const ruleOnlyViolations = allViolations.filter((v: any) => !v.competitorOverlap);
        console.log(`Competitor-aware rule check: ${competitorViolations.length} with competitor conflicts, ${ruleOnlyViolations.length} rule-only violations`);
      }
    } catch (error) {
      console.error('Error checking rule violations:', error);
      setViolations([]);
    } finally {
      setCheckingRules(false);
    }
  }, [dismissedViolationHashes, pdfExtractionId]);

  // Debounced rule checking when allScheduleRaces changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      checkRuleViolations(allScheduleRaces);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [allScheduleRaces, checkRuleViolations]);

  // Handle drag end
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    moveRace(result.source.index, result.destination.index);
  };

  // Handle race click for highlighting
  const handleRaceClick = useCallback((raceId: string) => {
    setHighlightedRaceIds(prev => 
      prev.includes(raceId) ? prev.filter(id => id !== raceId) : [...prev, raceId]
    );
    
    // Auto clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedRaceIds(prev => prev.filter(id => id !== raceId));
    }, 3000);
  }, []);

  // Handle violation click to highlight related races
  const handleHighlightRaces = useCallback((violation: RuleViolation) => {
    // Extract race IDs and start times from violation hash
    // Format: ruleId-race1Id-race1StartTime-race2Id-race2StartTime
    const hashParts = violation.violationHash.split('-');
    if (hashParts.length >= 5) {
      const race1Id = parseInt(hashParts[1]);
      const race1StartTime = hashParts[2];
      const race2Id = parseInt(hashParts[3]);
      const race2StartTime = hashParts[4];
      
      // Find the specific schedule races involved in this violation
      const scheduleRaceIds = allScheduleRaces
        .filter(sr => 
          (sr.race.id === race1Id && sr.startTime === race1StartTime) ||
          (sr.race.id === race2Id && sr.startTime === race2StartTime)
        )
        .map(sr => sr.id);
      
      setHighlightedRaceIds(scheduleRaceIds);
      
      // Auto clear highlight after 5 seconds
      setTimeout(() => {
        setHighlightedRaceIds([]);
      }, 5000);
    }
  }, [allScheduleRaces]);

  // Handle violation dismissal
  const handleDismissViolation = useCallback(async (violationHash: string) => {
    if (schedule && schedule.id > 0) {
      // Saved schedule - store dismissal in database
      try {
        const success = await window.electronAPI.dismissViolation(schedule.id, violationHash);
        if (success) {
          // Update local state to immediately hide the violation
          setDismissedViolationHashes(prev => [...prev, violationHash]);
          setDismissedCount(prev => prev + 1);
          // Re-filter violations
          setViolations(prev => prev.filter(v => v.violationHash !== violationHash));
        }
      } catch (error) {
        console.error('Error dismissing violation:', error);
      }
    } else {
      // Unsaved schedule - store dismissal in local state only
      setDismissedViolationHashes(prev => [...prev, violationHash]);
      setDismissedCount(prev => prev + 1);
      // Re-filter violations
      setViolations(prev => prev.filter(v => v.violationHash !== violationHash));
    }
  }, [schedule?.id]);

  // Calculate total duration
  const totalDuration = useMemo((): string => {
    if (scheduleRaces.length === 0) return '0 perc';
    const lastRace = scheduleRaces[scheduleRaces.length - 1];
    return calculateTotalDuration(startTime, lastRace.startTime, hungarianStrings);
  }, [scheduleRaces, startTime]);

  return (
    <div className="p-2 flex flex-col h-full">
      <div className="flex-shrink-0 mb-2">

        {/* Section navigation */}
        {schedule && schedule.sections.length > 0 && (
          <SectionNavigator
            sections={schedule.sections}
            currentSectionId={currentSectionId}
            onSectionChange={onSectionChange || (() => {})}
            className="mb-2"
          />
        )}

        {/* Rule Status Section - Moved before Settings for prominence */}
        {allScheduleRaces.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                {checkingRules ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Szabályok ellenőrzése...</span>
                  </>
                ) : violations.length === 0 && dismissedCount === 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Nincsenek szabálysértések</span>
                  </>
                ) : violations.length === 0 && dismissedCount > 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">{dismissedCount} figyelmen kívül hagyott szabálysértés</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <div className="flex items-center gap-2">
                      <Badge variant={violations.some(v => v.severity === 'error') ? 'destructive' : 'secondary'}>
                        {violations.length} probléma
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {violations.filter(v => v.severity === 'error').length > 0 ? 'Konfliktusok találhatók' : 'Figyelmeztetések vannak'}
                        {dismissedCount > 0 && ` • ${dismissedCount} figyelmen kívül hagyva`}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {violations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowViolations(!showViolations)}
                  className="h-6 text-xs"
                >
                  {showViolations ? 'Elrejtés' : 'Megjelenítés'}
                </Button>
              )}
            </div>

            {/* Rule Violations Display */}
            {showViolations && violations.length > 0 && (
              <div className="mt-2">
                <RuleViolationDisplay
                  violations={violations}
                  compact={true}
                  onDismiss={handleDismissViolation}
                  onHighlightRaces={handleHighlightRaces}
                />
              </div>
            )}
          </div>
        )}

        {/* Combined Settings and Section Management Panel */}
        <CombinedSettingsPanel
          scheduleName={scheduleName}
          setScheduleName={setScheduleName}
          startTime={startTime}
          setStartTime={setStartTime}
          intervalMinutes={intervalMinutes}
          setIntervalMinutes={setIntervalMinutes}
          totalDuration={totalDuration}
          raceCount={scheduleRaces.length}
          canSave={canSave}
          onSave={saveSchedule}
          scheduleId={schedule?.id}
          schedule={schedule}
          onSectionAdd={onSectionAdd || (() => {})}
          onSectionRemove={onSectionRemove || (() => {})}
          onSectionStartTimeChange={onSectionStartTimeChange || (() => {})}
          onSectionEmpty={emptySectionRaces}
          allowInMemory={true}
        />
      </div>

      {/* Main Content Area - Horizontal Layout for Competitor Tracker and Schedule */}
      <div className="flex-1 flex gap-2 min-h-0 overflow-hidden">
        {/* Left Panel - Competitor Tracking (Only in PDF mode) */}
        {pdfExtractionId && (
          <div className="w-[400px] flex-shrink-0 lg:block hidden flex flex-col">
            <CompetitorTracker
              scheduleRaces={allScheduleRaces}
              pdfExtractionId={pdfExtractionId}
              onHighlightRaces={(raceIds) => {
                setHighlightedRaceIds(raceIds);
                // Auto clear highlight after 3 seconds
                setTimeout(() => {
                  setHighlightedRaceIds([]);
                }, 3000);
              }}
              layout="sidebar"
            />
          </div>
        )}

        {/* Mobile Competitor Tracker - Vertical fallback on small screens */}
        {pdfExtractionId && (
          <div className="lg:hidden mb-2">
            <CompetitorTracker
              scheduleRaces={allScheduleRaces}
              pdfExtractionId={pdfExtractionId}
              onHighlightRaces={(raceIds) => {
                setHighlightedRaceIds(raceIds);
                // Auto clear highlight after 3 seconds
                setTimeout(() => {
                  setHighlightedRaceIds([]);
                }, 3000);
              }}
              layout="full"
            />
          </div>
        )}

        {/* Right Panel - Schedule Race List */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScheduleRaceList
            scheduleRaces={scheduleRaces}
            intervals={intervals}
            onDragEnd={handleDragEnd}
            onRemoveRace={removeRaceFromSchedule}
            onUpdateInterval={updateInterval}
            formatInterval={formatInterval}
            violations={violations}
            highlightedRaceIds={highlightedRaceIds}
            onRaceClick={handleRaceClick}
          />
        </div>
      </div>
    </div>
  );
});

ScheduleBuilder.displayName = 'ScheduleBuilder';

export default ScheduleBuilder;