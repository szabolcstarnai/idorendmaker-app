import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { ScheduleRace, RuleViolation } from '../../../shared/types/race';
import { ScrollArea } from '../ui/scroll-area';
import ScheduleRaceCard from './ScheduleRaceCard';
import IntervalSeparator from './IntervalSeparator';

interface ScheduleRaceListProps {
  scheduleRaces: ScheduleRace[];
  intervals: number[];
  onDragEnd: (result: DropResult) => void;
  onRemoveRace: (id: string) => void;
  onUpdateInterval: (intervalIndex: number, newMinutes: number) => void;
  formatInterval: (minutes: number) => string;
  className?: string;
  violations?: RuleViolation[];
  highlightedRaceIds?: string[];
  onRaceClick?: (raceId: string) => void;
}

// Hungarian strings for UI text
const hungarianStrings = {
  selectRacesFromLeft: 'Válasszon versenyszámokat a bal oldali listából',
};

/**
 * Schedule Race List Component
 * 
 * Manages the drag-drop list of races with interval separators.
 * Handles empty state, race cards, intervals, and drag-drop orchestration.
 */
const ScheduleRaceList: React.FC<ScheduleRaceListProps> = React.memo(({
  scheduleRaces,
  intervals,
  onDragEnd,
  onRemoveRace,
  onUpdateInterval,
  formatInterval,
  className = '',
  violations = [],
  highlightedRaceIds = [],
  onRaceClick
}) => {
  // Interval editing state
  const [editingIntervalIndex, setEditingIntervalIndex] = useState<number | null>(null);
  const [editingIntervalValue, setEditingIntervalValue] = useState<string>('');

  // Handle starting interval edit
  const startEditingInterval = useCallback((index: number) => {
    setEditingIntervalIndex(index);
    setEditingIntervalValue(intervals[index].toString());
  }, [intervals]);

  // Handle saving interval edit
  const saveIntervalEdit = useCallback(() => {
    if (editingIntervalIndex !== null) {
      const newValue = parseInt(editingIntervalValue);
      if (!isNaN(newValue) && newValue > 0) {
        onUpdateInterval(editingIntervalIndex, newValue);
      }
    }
    setEditingIntervalIndex(null);
    setEditingIntervalValue('');
  }, [editingIntervalIndex, editingIntervalValue, onUpdateInterval]);

  // Handle canceling interval edit
  const cancelIntervalEdit = useCallback(() => {
    setEditingIntervalIndex(null);
    setEditingIntervalValue('');
  }, []);

  // Helper function to get violation data for a race
  const getRaceViolationData = useCallback((scheduleRace: ScheduleRace) => {
    // Match violations by checking if this specific race+time combination appears in any violation
    // This ensures only races actually involved in violations get highlighted
    const raceViolations = violations.filter(v => {
      // Check if this schedule race matches either race in the violation
      // We match by both race ID and start time to identify specific race+level combinations
      const matchesRace1 = v.race1.id === scheduleRace.race.id && 
                          v.violationHash.includes(`-${scheduleRace.race.id}-${scheduleRace.startTime}-`)
      const matchesRace2 = v.race2.id === scheduleRace.race.id && 
                          v.violationHash.includes(`-${scheduleRace.race.id}-${scheduleRace.startTime}`)
      
      return matchesRace1 || matchesRace2
    });
    
    return {
      hasViolation: raceViolations.length > 0,
      violationCount: raceViolations.length,
      isHighlighted: highlightedRaceIds.includes(scheduleRace.id)
    };
  }, [violations, highlightedRaceIds]);

  return (
    <ScrollArea className={`flex-1 ${className}`}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="schedule-list">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-0.5 p-2 ${snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''}`}
            >
              {scheduleRaces.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>{hungarianStrings.selectRacesFromLeft}</p>
                </div>
              ) : (
                scheduleRaces.map((scheduleRace, index) => (
                  <React.Fragment key={`race-${scheduleRace.id}`}>
                    <Draggable
                      key={scheduleRace.id}
                      draggableId={scheduleRace.id}
                      index={index}
                    >
                      {(provided, snapshot) => {
                        const violationData = getRaceViolationData(scheduleRace);
                        return (
                          <ScheduleRaceCard
                            scheduleRace={scheduleRace}
                            index={index}
                            isDragging={snapshot.isDragging}
                            onRemove={onRemoveRace}
                            draggableProps={provided.draggableProps}
                            dragHandleProps={provided.dragHandleProps}
                            innerRef={provided.innerRef}
                            hasViolation={violationData.hasViolation}
                            violationCount={violationData.violationCount}
                            isHighlighted={violationData.isHighlighted}
                            onCardClick={violationData.hasViolation && onRaceClick ? () => onRaceClick(scheduleRace.id) : undefined}
                          />
                        );
                      }}
                    </Draggable>
                    
                    {/* Interval separator - show between races */}
                    {index < scheduleRaces.length - 1 && intervals[index] !== undefined && (
                      <IntervalSeparator
                        index={index}
                        interval={intervals[index]}
                        isEditing={editingIntervalIndex === index}
                        editValue={editingIntervalValue}
                        onStartEdit={startEditingInterval}
                        onSaveEdit={saveIntervalEdit}
                        onCancelEdit={cancelIntervalEdit}
                        onEditValueChange={setEditingIntervalValue}
                        formatInterval={formatInterval}
                      />
                    )}
                  </React.Fragment>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </ScrollArea>
  );
});

ScheduleRaceList.displayName = 'ScheduleRaceList';

export default ScheduleRaceList;