import React from 'react';
import { Clock, Save } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { LegacyCollapsible } from '../ui/collapsible';
import { ExportButton } from '../dialogs/ExportButton';

interface ScheduleSettingsProps {
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
  className?: string;
}

// Hungarian strings for UI text
const hungarianStrings = {
  settings: 'Beállítások',
  scheduleName: 'Időrend neve',
  startTime: 'Aktuális szakasz kezdési ideje',
  intervalMinutes: 'Következő versenyszám utáni időköz (perc)',
  save: 'Mentés',
  races: 'verseny'
};

/**
 * Schedule Settings Component
 * 
 * Handles schedule-level configuration and save operations.
 * Contains collapsible panel with name, timing, and save controls.
 */
const ScheduleSettings: React.FC<ScheduleSettingsProps> = React.memo(({
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
  className = ''
}) => {
  return (
    <LegacyCollapsible 
      title={hungarianStrings.settings} 
      defaultOpen={false} 
      className={`mb-3 ${className}`}
    >
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
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
            
            <div>
              <label className="block text-xs font-medium text-foreground mb-0.5">
                {hungarianStrings.startTime}
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-foreground mb-0.5">
                {hungarianStrings.intervalMinutes}
              </label>
              <Input
                type="number"
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                min="5"
                max="60"
                className="h-8"
              />
            </div>
          </div>
        
          <div className="mt-2 flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              {totalDuration} • {raceCount} {hungarianStrings.races}
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                scheduleId={scheduleId}
                scheduleName={scheduleName}
                size="sm"
                variant="outline"
                disabled={!scheduleId || scheduleId <= 0}
                className="h-8"
              />
              <Button
                onClick={onSave}
                disabled={!canSave}
                className="flex items-center h-8 px-3"
                size="sm"
              >
                <Save className="w-3 h-3 mr-1" />
                {hungarianStrings.save}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </LegacyCollapsible>
  );
});

ScheduleSettings.displayName = 'ScheduleSettings';

export default ScheduleSettings;