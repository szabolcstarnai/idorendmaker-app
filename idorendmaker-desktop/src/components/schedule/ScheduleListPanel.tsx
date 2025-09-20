import React, { useState, useEffect, useMemo } from 'react';
import { ScrollArea } from '../ui/scroll-area';
import ProfessionalSearch from '../common/ProfessionalSearch';
import StandardEmptyState from '../common/StandardEmptyState';
import { TabbedPanelLoading } from '../ui/loading';
import CompactScheduleCard, { ScheduleWithPDFStatus } from './CompactScheduleCard';

interface ScheduleListPanelProps {
  selectedSchedule?: ScheduleWithPDFStatus;
  onScheduleSelect: (schedule: ScheduleWithPDFStatus) => void;
  onCreateNewSchedule?: () => void;
}

/**
 * ScheduleListPanel
 *
 * Left panel component for schedule browsing and selection.
 * Follows the same patterns as RuleManager's left panel.
 */
const ScheduleListPanel: React.FC<ScheduleListPanelProps> = ({
  selectedSchedule,
  onScheduleSelect,
  onCreateNewSchedule
}) => {
  const [schedules, setSchedules] = useState<ScheduleWithPDFStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search debouncing state
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadSchedules();
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTerm !== '') {
      setSearchLoading(true);
    }
    const timer = setTimeout(() => {
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all schedules from database
      const allSchedules = await window.electronAPI.getAllSchedules();

      // Check PDF context for each schedule
      const schedulesWithPDFStatus = await Promise.all(
        allSchedules.map(async (schedule) => {
          try {
            const { hasPDFData, pdfExtractionId } = await window.electronAPI.getScheduleWithPDFContext(schedule.id);
            return {
              ...schedule,
              hasPDFData,
              pdfExtractionId
            };
          } catch (error) {
            console.error(`Error checking PDF status for schedule ${schedule.id}:`, error);
            return {
              ...schedule,
              hasPDFData: false
            };
          }
        })
      );

      setSchedules(schedulesWithPDFStatus);
    } catch (err) {
      console.error('Failed to load schedules:', err);
      setError('Hiba az időrendek betöltése közben');
    } finally {
      setLoading(false);
    }
  };

  // Filter schedules based on search term
  const filteredSchedules = useMemo(() => {
    if (!searchTerm.trim()) {
      return schedules;
    }

    const searchLower = searchTerm.toLowerCase();
    return schedules.filter(schedule =>
      schedule.name.toLowerCase().includes(searchLower)
    );
  }, [schedules, searchTerm]);

  // Calculate stats
  const stats = useMemo(() => ({
    totalSchedules: schedules.length,
    filteredSchedules: filteredSchedules.length,
    pdfSchedules: schedules.filter(s => s.hasPDFData).length
  }), [schedules, filteredSchedules]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-shrink-0 p-3 border-b">
          <h3 className="text-sm font-medium text-foreground">
            Időrendek ({stats.totalSchedules})
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <StandardEmptyState
            type="error"
            title="Hiba történt"
            description={error}
            actionLabel="Újrapróbálkozás"
            onAction={loadSchedules}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with search */}
      <div className="flex-shrink-0 space-y-3 p-3 border-b">
        <h3 className="text-sm font-medium text-foreground">
          Időrendek ({stats.totalSchedules})
        </h3>

        <ProfessionalSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Keresés időrendek között..."
          isLoading={searchLoading}
        />
      </div>

      {/* Schedule List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <TabbedPanelLoading message="Időrendek betöltése..." />
          ) : filteredSchedules.length === 0 ? (
            <div className="py-8">
              <StandardEmptyState
                type="no-data"
                title={searchTerm ? 'Nincs találat' : 'Még nincs mentett időrend'}
                description={
                  searchTerm
                    ? 'Próbáljon más keresési kifejezést használni.'
                    : 'Kezdjen egy új időrend készítésével.'
                }
                actionLabel={searchTerm ? undefined : "Új időrend készítése"}
                onAction={searchTerm ? undefined : onCreateNewSchedule}
              />
            </div>
          ) : (
            filteredSchedules.map((schedule) => (
              <CompactScheduleCard
                key={schedule.id}
                schedule={schedule}
                isSelected={selectedSchedule?.id === schedule.id}
                onClick={onScheduleSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScheduleListPanel;