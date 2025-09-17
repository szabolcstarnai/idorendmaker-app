import { useCallback } from 'react';
import { ScheduleWithSections, SectionWorkingData } from '../../../../shared/types/race';
import { toast } from 'sonner';

interface UseSaveScheduleProps {
  schedule?: ScheduleWithSections;
  sectionDataMap: Map<number, SectionWorkingData>;
  scheduleName: string;
  pdfExtractionId?: number; // Optional PDF data to link
  onScheduleSave?: (schedule: ScheduleWithSections, scheduleName: string, sectionData: Map<number, SectionWorkingData>, pdfExtractionId?: number) => void;
  onSaveSuccess?: () => void; // Callback to clear unsaved changes state
}

interface UseSaveScheduleReturn {
  saveSchedule: () => Promise<void>;
  canSave: boolean;
}

// Hungarian strings for save operations
const hungarianStrings = {
  scheduleSavedWithId: 'Időrend sikeresen mentve!',
  scheduleErrorSaving: 'Hiba történt az időrend mentése közben!'
};

/**
 * Custom hook for handling schedule save operations
 * Manages both callback mode (parent saves) and direct database save mode
 */
export const useSaveSchedule = ({
  schedule,
  sectionDataMap,
  scheduleName,
  pdfExtractionId,
  onScheduleSave,
  onSaveSuccess
}: UseSaveScheduleProps): UseSaveScheduleReturn => {
  
  // Determine if save is possible
  const canSave = sectionDataMap.size > 0 && !!schedule;
  
  // Save function for entire schedule with all sections
  const saveSchedule = useCallback(async () => {
    try {
      if (!schedule) {
        toast.error('No schedule to save');
        return;
      }

      console.log('=== SCHEDULE BUILDER SAVE DEBUG ===');
      console.log('Schedule from ScheduleBuilder:', schedule);
      console.log('sectionDataMap from ScheduleBuilder:', sectionDataMap);
      console.log('sectionDataMap size:', sectionDataMap.size);
      console.log('sectionDataMap entries:');
      sectionDataMap.forEach((data, id) => {
        console.log(`  Section ${id}:`, data);
      });

      // Save via callback or direct database call
      if (onScheduleSave) {
        console.log('Calling onScheduleSave with:', { schedule, scheduleName, sectionDataMap, pdfExtractionId });
        // Pass the complete section working data and updated name to the parent
        onScheduleSave(schedule, scheduleName, sectionDataMap, pdfExtractionId);
        toast.success(hungarianStrings.scheduleSavedWithId);
      } else {
        // Direct save to database - convert section map to database format
        const sectionDataArray = schedule.sections.map(section => {
          const workingData = sectionDataMap.get(section.id);
          
          return {
            dayNumber: section.dayNumber,
            sectionType: section.sectionType as 'délelőtt' | 'délután',
            startTime: workingData?.settings.startTime || section.startTime,
            items: workingData?.races.map((sr, index) => ({
              raceId: sr.race.id,
              levelId: sr.level.id,
              orderIndex: index,
              intervalMinutes: workingData.intervals[index] || workingData.settings.defaultInterval,
              notes: undefined
            })) || []
          };
        });

        let scheduleId: number;
        
        // Decide between create (new schedule) vs update (existing schedule)
        if (schedule.id === -1) {
          // New schedule - create in database
          console.log('Creating new schedule:', scheduleName);
          scheduleId = await window.electronAPI.saveScheduleWithSections(
            scheduleName,
            sectionDataArray,
            pdfExtractionId  // Link PDF data if provided
          );
          console.log('New schedule created with ID:', scheduleId);
        } else {
          // Existing schedule - update in database
          console.log('Updating existing schedule ID:', schedule.id, 'with name:', scheduleName);
          scheduleId = await window.electronAPI.updateScheduleWithSections(
            schedule.id,
            scheduleName,
            sectionDataArray,
            pdfExtractionId  // Link PDF data if provided
          );
          console.log('Schedule updated successfully');
        }

        // Log the PDF linking result
        if (pdfExtractionId) {
          console.log(`Schedule ${scheduleId} linked to PDF extraction ${pdfExtractionId}`);
        }

        toast.success(`${hungarianStrings.scheduleSavedWithId} (ID: ${scheduleId})`);
      }
      
      // Call success callback to clear unsaved changes state
      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(hungarianStrings.scheduleErrorSaving);
    }
  }, [schedule, sectionDataMap, scheduleName, pdfExtractionId, onScheduleSave, onSaveSuccess]);

  return {
    saveSchedule,
    canSave
  };
};