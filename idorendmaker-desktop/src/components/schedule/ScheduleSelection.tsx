import React, { useState } from 'react';
import { Schedule } from '../../../shared/types/race';
import { TwoPanelLayout } from '../layout/TwoPanelLayout';
import ScheduleListPanel from './ScheduleListPanel';
import ScheduleDetailsPanel from './ScheduleDetailsPanel';
import { ScheduleWithPDFStatus } from './CompactScheduleCard';

interface ScheduleSelectionProps {
  onScheduleSelected: (schedule: Schedule) => void;
  onCreateNewSchedule?: () => void;
}

/**
 * ScheduleSelection
 *
 * Redesigned schedule management interface following the Work Layer pattern.
 * Uses TwoPanelLayout with ScheduleListPanel (left) and ScheduleDetailsPanel (right).
 */
const ScheduleSelection: React.FC<ScheduleSelectionProps> = ({
  onScheduleSelected,
  onCreateNewSchedule
}) => {
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithPDFStatus | undefined>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleScheduleSelect = (schedule: ScheduleWithPDFStatus) => {
    setSelectedSchedule(schedule);
  };

  const handleScheduleLoad = (schedule: ScheduleWithPDFStatus) => {
    // This handles the actual loading/navigation to the schedule builder
    onScheduleSelected(schedule);
  };

  const handleScheduleDeleted = () => {
    // Clear selection and trigger refresh of the list
    setSelectedSchedule(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleScheduleRenamed = () => {
    // Trigger refresh of the list to show updated name
    setRefreshTrigger(prev => prev + 1);
  };

  const handleScheduleUpdated = (updatedSchedule: ScheduleWithPDFStatus) => {
    // Update the selected schedule object with new data
    setSelectedSchedule(updatedSchedule);
    // Also trigger list refresh to ensure consistency
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <TwoPanelLayout>
      <TwoPanelLayout.SidePanel>
        <ScheduleListPanel
          key={refreshTrigger} // Force re-render when refresh needed
          selectedSchedule={selectedSchedule}
          onScheduleSelect={handleScheduleSelect}
          onCreateNewSchedule={onCreateNewSchedule}
        />
      </TwoPanelLayout.SidePanel>

      <TwoPanelLayout.MainPanel>
        <ScheduleDetailsPanel
          selectedSchedule={selectedSchedule}
          onScheduleSelected={handleScheduleLoad}
          onCreateNewSchedule={onCreateNewSchedule}
          onScheduleDeleted={handleScheduleDeleted}
          onScheduleRenamed={handleScheduleRenamed}
          onScheduleUpdated={handleScheduleUpdated}
        />
      </TwoPanelLayout.MainPanel>
    </TwoPanelLayout>
  );
};

export default ScheduleSelection;