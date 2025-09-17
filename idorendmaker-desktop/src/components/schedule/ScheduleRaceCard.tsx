import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { DraggableProvidedDraggableProps, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { ScheduleRace } from '../../../shared/types/race';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface ScheduleRaceCardProps {
  scheduleRace: ScheduleRace;
  index: number;
  isDragging: boolean;
  onRemove: (id: string) => void;
  // Drag & Drop props from react-beautiful-dnd
  draggableProps: DraggableProvidedDraggableProps;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  innerRef: (element: HTMLElement | null) => void;
  // Violation highlighting
  hasViolation?: boolean;
  violationCount?: number;
  isHighlighted?: boolean;
  onCardClick?: () => void;
}

/**
 * Schedule Race Card Component
 * 
 * Renders an individual race card with drag functionality.
 * Displays race information, badges, and provides remove functionality.
 */
const ScheduleRaceCard: React.FC<ScheduleRaceCardProps> = React.memo(({
  scheduleRace,
  index,
  isDragging,
  onRemove,
  draggableProps,
  dragHandleProps,
  innerRef,
  hasViolation = false,
  violationCount = 0,
  isHighlighted = false,
  onCardClick
}) => {
  return (
    <Card
      ref={innerRef}
      {...draggableProps}
      onClick={onCardClick}
      className={`
        hover:shadow-md transition-all duration-200 cursor-grab
        ${isDragging ? 'shadow-lg rotate-1' : ''}
        ${hasViolation ? 'border-amber-400 bg-amber-50/80 hover:bg-amber-50' : ''}
        ${isHighlighted ? 'ring-2 ring-amber-400 ring-offset-2 shadow-lg hover:ring-amber-500' : ''}
      `}
    >
      <CardContent className="p-2">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div 
                  {...dragHandleProps}
                  className={`
                    text-sm font-mono font-bold cursor-grab active:cursor-grabbing px-2 py-1 rounded
                    ${hasViolation ? 'bg-amber-300 text-amber-900 font-bold' : 'text-primary'}
                  `}
                >
                  {scheduleRace.startTime}
                </div>
                {hasViolation && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                    {violationCount > 0 && (
                      <Badge variant="secondary" className="h-4 text-xs px-1 bg-amber-100 text-amber-700 border-amber-300">
                        {violationCount}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-xs">{scheduleRace.race.name}</div>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  <Badge variant="default" className="text-xs px-1 py-0 bg-blue-100 text-blue-800 border-blue-200">
                    {scheduleRace.level.name}
                  </Badge>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {scheduleRace.race.discipline}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {scheduleRace.race.boatClass}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {scheduleRace.race.gender}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {scheduleRace.race.distance}
                  </Badge>
                </div>
                {scheduleRace.race.ageGroups.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-0">
                    {scheduleRace.race.ageGroups.map(ag => ag.name).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs px-1 py-0">
              #{index + 1}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(scheduleRace.id)}
              className="text-destructive hover:text-destructive h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ScheduleRaceCard.displayName = 'ScheduleRaceCard';

export default ScheduleRaceCard;