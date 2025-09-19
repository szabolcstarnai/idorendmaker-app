import React, { useMemo } from 'react';
import { Clock, Save, Plus, Trash2, Calendar, RotateCcw } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { LegacyCollapsible } from '../ui/collapsible';
import { ExportButton } from '../dialogs/ExportButton';
import { ScheduleSection, CreateScheduleSectionData } from '../../../shared/types/race';

interface CombinedSettingsPanelProps {
  // Settings props
  scheduleName: string;
  setScheduleName: (name: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  intervalMinutes: number;
  setIntervalMinutes: (interval: number) => void;
  totalDuration: string;
  raceCount: number;
  canSave: boolean;
  onSave: () => void;
  scheduleId?: number | null;

  // Day section management props
  schedule?: { id: number; sections: ScheduleSection[] };
  onSectionAdd?: (sectionData: CreateScheduleSectionData) => void;
  onSectionRemove?: (sectionId: number) => void;
  onSectionStartTimeChange?: (sectionId: number, startTime: string) => void;
  onSectionEmpty?: (sectionId: number) => void;
  allowInMemory?: boolean;

  className?: string;
}

// Hungarian strings for UI text
const hungarianStrings = {
  combinedTitle: 'Beállítások és szakaszok',
  scheduleName: 'Időrend neve',
  save: 'Mentés',
  races: 'verseny',
  currentSections: 'Jelenlegi szakaszok:',
  addNewDay: 'Új nap hozzáadása'
};

const CombinedSettingsPanel: React.FC<CombinedSettingsPanelProps> = ({
  // Settings props
  scheduleName,
  setScheduleName,
  startTime,
  setStartTime,
  intervalMinutes,
  setIntervalMinutes,
  totalDuration,
  raceCount,
  canSave,
  onSave,
  scheduleId,

  // Day section props
  schedule,
  onSectionAdd,
  onSectionRemove,
  onSectionStartTimeChange,
  onSectionEmpty,
  allowInMemory = false,

  className = ''
}) => {
  const sections = schedule?.sections || [];

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

  // Check if we can add a new day
  const canAddNewDay = (): boolean => {
    if (sections.length === 0) return true;
    const maxDay = Math.max(...sections.map(s => s.dayNumber));
    const sectionsInLastDay = sections.filter(s => s.dayNumber === maxDay);
    return sectionsInLastDay.length > 0;
  };

  // Default times based on section type
  const getDefaultTime = (sectionType: 'délelőtt' | 'délután'): string => {
    return sectionType === 'délelőtt' ? '09:00' : '14:00';
  };

  const handleAddSection = (dayNumber: number, sectionType: 'délelőtt' | 'délután') => {
    if (!schedule?.id && !allowInMemory) return;
    if (!onSectionAdd) return;

    const sectionData: CreateScheduleSectionData = {
      scheduleId: schedule?.id || -1,
      dayNumber,
      sectionType,
      startTime: getDefaultTime(sectionType)
    };

    onSectionAdd(sectionData);
  };

  const handleAddNewDay = () => {
    if (!schedule?.id && !allowInMemory) return;
    if (!canAddNewDay() || !onSectionAdd) return;

    const nextDay = sections.length === 0 ? 1 : Math.max(...sections.map(s => s.dayNumber)) + 1;

    const sectionData: CreateScheduleSectionData = {
      scheduleId: schedule?.id || -1,
      dayNumber: nextDay,
      sectionType: 'délelőtt',
      startTime: getDefaultTime('délelőtt')
    };

    onSectionAdd(sectionData);
  };

  const canRemoveSection = (section: ScheduleSection) => {
    if (sections.length <= 1) return false;
    const maxDay = Math.max(...sections.map(s => s.dayNumber));
    if (section.dayNumber !== maxDay) return false;
    return true;
  };

  return (
    <LegacyCollapsible
      title={hungarianStrings.combinedTitle}
      defaultOpen={false}
      className={`mb-3 ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - Schedule Settings */}
        <Card>
          <CardContent className="p-3">
            <div className="space-y-3">
              {/* Title row with stats and buttons */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">Alapbeállítások</div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground">
                    {totalDuration} • {raceCount} {hungarianStrings.races}
                  </div>
                  <ExportButton
                    scheduleId={scheduleId}
                    scheduleName={scheduleName}
                    size="sm"
                    variant="outline"
                    disabled={!scheduleId || scheduleId <= 0}
                    className="h-6"
                  />
                  <Button
                    onClick={onSave}
                    disabled={!canSave}
                    className="flex items-center h-6 px-2"
                    size="sm"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    {hungarianStrings.save}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {/* Schedule name and interval on same line */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      {hungarianStrings.scheduleName}
                    </label>
                    <Input
                      type="text"
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      className="h-8"
                    />
                  </div>

                  <div className="flex-shrink-0">
                    <label className="block text-xs font-medium text-foreground mb-0.5">
                      Alapértelmezett időköz
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={intervalMinutes}
                        onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                        min="5"
                        max="60"
                        className="h-8 w-14"
                      />
                      <span className="text-xs text-muted-foreground">perc</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Day Section Management */}
        <Card>
          <CardContent className="p-3">
            {!schedule?.id && !allowInMemory ? (
              <div className="flex items-center justify-center h-32 text-center text-muted-foreground text-sm">
                Mentse el a fő időrend beállításokat a szakaszok kezeléséhez
              </div>
            ) : (
              <div className="space-y-3">
                {/* Title row with stats and add day button */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground">Napok és szakaszok</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">
                      {sections.length} szakasz • {sectionsByDay.size} nap
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewDay}
                      className="h-6 px-2 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                      disabled={!canAddNewDay() || (!schedule?.id && !allowInMemory)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {hungarianStrings.addNewDay}
                    </Button>
                  </div>
                </div>

                <div className="max-h-24 overflow-y-auto border rounded">
                  <div className="p-2 space-y-1">
                    {Array.from(sectionsByDay.keys()).sort().map(dayNumber => {
                      const daySections = sectionsByDay.get(dayNumber) || [];
                      const morningSection = daySections.find(s => s.sectionType === 'délelőtt');
                      const afternoonSection = daySections.find(s => s.sectionType === 'délután');

                      return (
                        <div key={dayNumber} className="border rounded-md p-1.5">
                          <div className="flex items-center gap-3">
                            {/* Day header - compact */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs font-medium">{dayNumber}. nap</span>
                            </div>

                            {/* Morning section - compact */}
                            {morningSection ? (
                              <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-0.5">
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  DE
                                </Badge>
                                <Input
                                  type="time"
                                  value={morningSection.startTime}
                                  onChange={(e) => onSectionStartTimeChange?.(morningSection.id, e.target.value)}
                                  className="h-5 w-16 text-xs px-1"
                                />
                                {onSectionEmpty && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSectionEmpty(morningSection.id)}
                                    className="h-4 w-4 p-0 text-orange-600 hover:text-orange-700"
                                    title="Versenyszámok törlése"
                                  >
                                    <RotateCcw className="w-2 h-2" />
                                  </Button>
                                )}
                                {canRemoveSection(morningSection) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSectionRemove?.(morningSection.id)}
                                    className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                                    title="Szakasz törlése"
                                  >
                                    <Trash2 className="w-2 h-2" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSection(dayNumber, 'délelőtt')}
                                className="h-6 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50 border-dashed"
                                disabled={!schedule?.id && !allowInMemory}
                              >
                                <Plus className="w-2 h-2 mr-1" />
                                DE
                              </Button>
                            )}

                            {/* Afternoon section - compact */}
                            {afternoonSection ? (
                              <div className="flex items-center gap-1 bg-gray-50 rounded px-1.5 py-0.5">
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  DU
                                </Badge>
                                <Input
                                  type="time"
                                  value={afternoonSection.startTime}
                                  onChange={(e) => onSectionStartTimeChange?.(afternoonSection.id, e.target.value)}
                                  className="h-5 w-16 text-xs px-1"
                                />
                                {onSectionEmpty && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSectionEmpty(afternoonSection.id)}
                                    className="h-4 w-4 p-0 text-orange-600 hover:text-orange-700"
                                    title="Versenyszámok törlése"
                                  >
                                    <RotateCcw className="w-2 h-2" />
                                  </Button>
                                )}
                                {canRemoveSection(afternoonSection) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onSectionRemove?.(afternoonSection.id)}
                                    className="h-4 w-4 p-0 text-destructive hover:text-destructive"
                                    title="Szakasz törlése"
                                  >
                                    <Trash2 className="w-2 h-2" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddSection(dayNumber, 'délután')}
                                className="h-6 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50 border-dashed"
                                disabled={!schedule?.id && !allowInMemory}
                              >
                                <Plus className="w-2 h-2 mr-1" />
                                DU
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LegacyCollapsible>
  );
};

export default CombinedSettingsPanel;