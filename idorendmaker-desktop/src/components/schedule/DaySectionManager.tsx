import React, { useMemo } from 'react';
import { Plus, Trash2, Clock, Calendar, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { LegacyCollapsible } from '../ui/collapsible';
import { ScrollArea } from '../ui/scroll-area';
import { ScheduleSection, CreateScheduleSectionData } from '../../../shared/types/race';

interface DaySectionManagerProps {
  scheduleId?: number;
  sections: ScheduleSection[];
  onSectionAdd: (sectionData: CreateScheduleSectionData) => void;
  onSectionRemove: (sectionId: number) => void;
  onSectionStartTimeChange: (sectionId: number, startTime: string) => void;
  onSectionEmpty?: (sectionId: number) => void;
  className?: string;
  // Allow in-memory operation when scheduleId is not available
  allowInMemory?: boolean;
}

const DaySectionManager: React.FC<DaySectionManagerProps> = ({
  scheduleId,
  sections,
  onSectionAdd,
  onSectionRemove,
  onSectionStartTimeChange,
  onSectionEmpty,
  className = '',
  allowInMemory = false
}) => {
  // No longer need form state - buttons will handle creation directly

  // Group sections by day for organized display
  const sectionsByDay = useMemo(() => {
    const grouped = new Map<number, ScheduleSection[]>();
    sections.forEach(section => {
      if (!grouped.has(section.dayNumber)) {
        grouped.set(section.dayNumber, []);
      }
      grouped.get(section.dayNumber)?.push(section);
    });
    
    // Sort sections within each day (délelőtt first, then délután)
    grouped.forEach(daySections => {
      daySections.sort((a, b) => {
        if (a.sectionType === 'délelőtt' && b.sectionType === 'délután') return -1;
        if (a.sectionType === 'délután' && b.sectionType === 'délelőtt') return 1;
        return 0;
      });
    });
    
    return grouped;
  }, [sections]);




  // Check if we can add a new day (previous day must have at least one section)
  const canAddNewDay = (): boolean => {
    if (sections.length === 0) return true; // Can always add first day
    
    const maxDay = Math.max(...sections.map(s => s.dayNumber));
    const sectionsInLastDay = sections.filter(s => s.dayNumber === maxDay);
    
    return sectionsInLastDay.length > 0; // Last day must have at least one section
  };


  // Default times based on section type
  const getDefaultTime = (sectionType: 'délelőtt' | 'délután'): string => {
    return sectionType === 'délelőtt' ? '09:00' : '14:00';
  };

  const handleAddSection = (dayNumber: number, sectionType: 'délelőtt' | 'délután') => {
    // Allow operation with or without scheduleId when allowInMemory is true
    if (!scheduleId && !allowInMemory) return;

    const sectionData: CreateScheduleSectionData = {
      scheduleId: scheduleId || -1, // Use -1 for temporary in-memory schedules
      dayNumber,
      sectionType,
      startTime: getDefaultTime(sectionType)
    };

    onSectionAdd(sectionData);
  };

  const handleAddNewDay = () => {
    // Allow operation with or without scheduleId when allowInMemory is true
    if (!scheduleId && !allowInMemory) return;
    if (!canAddNewDay()) return;

    const nextDay = sections.length === 0 ? 1 : Math.max(...sections.map(s => s.dayNumber)) + 1;

    // Add morning section for the new day by default
    const sectionData: CreateScheduleSectionData = {
      scheduleId: scheduleId || -1, // Use -1 for temporary in-memory schedules
      dayNumber: nextDay,
      sectionType: 'délelőtt',
      startTime: getDefaultTime('délelőtt')
    };

    onSectionAdd(sectionData);
  };

  const canRemoveSection = (section: ScheduleSection) => {
    // Must have more than 1 section total
    if (sections.length <= 1) return false;
    
    // Can only remove sections from the last day to maintain consecutive days
    const maxDay = Math.max(...sections.map(s => s.dayNumber));
    if (section.dayNumber !== maxDay) return false;
    
    // If removing from the last day, check if it would leave the day empty
    const sectionsInDay = sections.filter(s => s.dayNumber === section.dayNumber);
    
    // If this is the only section in the last day, always allow removal
    if (sectionsInDay.length === 1) return true;
    
    // If there are 2 sections in the last day, allow removing either one
    return true;
  };

  // Only show the "save first" message if not allowing in-memory operation
  if (!scheduleId && !allowInMemory) {
    return (
      <Card className={className}>
        <CardContent className="p-3">
          <div className="text-center text-muted-foreground text-sm">
            Mentse el a fő időrend beállításokat a szakaszok kezeléséhez
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <LegacyCollapsible title="Nap és szakasz kezelés" defaultOpen={false} className={className}>
      <Card>
        <ScrollArea className="max-h-64 overflow-auto">
          <CardContent className="p-3 space-y-3">

          {/* Current Sections Display */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Jelenlegi szakaszok:</span>
            {Array.from(sectionsByDay.keys()).sort().map(dayNumber => {
              const daySections = sectionsByDay.get(dayNumber) || [];
              const morningSection = daySections.find(s => s.sectionType === 'délelőtt');
              const afternoonSection = daySections.find(s => s.sectionType === 'délután');
              
              return (
                <div key={dayNumber} className="border rounded-md p-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Day header */}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs font-medium">{dayNumber}. nap</span>
                    </div>
                    
                    {/* Horizontal sections layout */}
                    <div className="flex gap-2">
                      {/* Morning section - either existing or add button */}
                      {morningSection ? (
                        <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            Délelőtt
                          </Badge>
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <Input
                            type="time"
                            value={morningSection.startTime}
                            onChange={(e) => onSectionStartTimeChange(morningSection.id, e.target.value)}
                            className="h-5 w-16 text-xs px-1"
                          />
                          {onSectionEmpty && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSectionEmpty(morningSection.id)}
                              className="h-4 w-4 p-0 text-orange-600 hover:text-orange-700"
                              title="Versenyszámok törlése (szakasz megtartása)"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </Button>
                          )}
                          {canRemoveSection(morningSection) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSectionRemove(morningSection.id)}
                              className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                              title="Szakasz törlése"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSection(dayNumber, 'délelőtt')}
                          className="h-7 px-3 text-xs border-green-300 text-green-700 hover:bg-green-50 border-dashed"
                          disabled={!scheduleId && !allowInMemory}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Délelőtt
                        </Button>
                      )}
                      
                      {/* Afternoon section - either existing or add button */}
                      {afternoonSection ? (
                        <div className="flex items-center gap-1 bg-gray-50 rounded px-2 py-1">
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            Délután
                          </Badge>
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <Input
                            type="time"
                            value={afternoonSection.startTime}
                            onChange={(e) => onSectionStartTimeChange(afternoonSection.id, e.target.value)}
                            className="h-5 w-16 text-xs px-1"
                          />
                          {onSectionEmpty && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSectionEmpty(afternoonSection.id)}
                              className="h-4 w-4 p-0 text-orange-600 hover:text-orange-700"
                              title="Versenyszámok törlése (szakasz megtartása)"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                            </Button>
                          )}
                          {canRemoveSection(afternoonSection) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSectionRemove(afternoonSection.id)}
                              className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                              title="Szakasz törlése"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSection(dayNumber, 'délután')}
                          className="h-7 px-3 text-xs border-green-300 text-green-700 hover:bg-green-50 border-dashed"
                          disabled={!scheduleId && !allowInMemory}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Délután
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Day Button */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNewDay}
              className="w-full h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
              disabled={!canAddNewDay() || (!scheduleId && !allowInMemory)}
            >
              <Plus className="w-3 h-3 mr-2" />
              Új nap hozzáadása
            </Button>
          </div>

          {/* Summary */}
          <div className="border-t pt-2 mt-2">
            <div className="text-xs text-muted-foreground">
              {sections.length} szakasz • {sectionsByDay.size} nap
            </div>
          </div>
        </CardContent>
        </ScrollArea>
      </Card>
    </LegacyCollapsible>
  );
};

export default DaySectionManager;