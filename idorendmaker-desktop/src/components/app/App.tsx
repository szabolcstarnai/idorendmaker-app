import React, { useState, useEffect, useRef } from 'react';
import RaceList from '../race/RaceList';
import ScheduleBuilder from '../schedule/ScheduleBuilder';
import MainMenu from './MainMenu';
import ScheduleSelection from '../schedule/ScheduleSelection';
import ScheduleModeSelector from '../schedule/ScheduleModeSelector';
import RuleManager from '../rules/RuleManager';
import RuleEditor from '../rules/RuleEditor';
import PDFProcessor from '../pdf/PDFProcessor';
import Navbar from './Navbar';
import UnsavedChangesDialog from '../dialogs/UnsavedChangesDialog';
import { TwoPanelLayout } from '../layout/TwoPanelLayout';
import { RaceWithAgeGroupsAndBoatClass, ScheduleWithSections, ScheduleSection, CreateScheduleSectionData, ScheduleRace, SectionWorkingData, Schedule, RuleWithConditions, CreateRuleData, Level, ScheduleMode } from '../../../shared/types/race';
import { useUnsavedChanges } from '../../features/common/hooks/useUnsavedChanges';
import { Toaster } from '../ui/sonner';
import { toast } from 'sonner';

type AppView = 'main-menu' | 'select-mode' | 'create-schedule' | 'load-schedule' | 'rule-management' | 'rule-editor' | 'pdf-processor' | 'pdf-to-schedule';

const App: React.FC = () => {
  // Navigation state
  const [currentView, setCurrentView] = useState<AppView>('main-menu');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('full');
  
  const [scheduleRaces, setScheduleRaces] = useState<ScheduleRace[]>([]);
  
  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleWithSections | undefined>();
  const [currentSectionId, setCurrentSectionId] = useState<number | undefined>();
  
  // Rule management state
  const [editingRule, setEditingRule] = useState<RuleWithConditions | undefined>();
  const [ruleListRefreshKey, setRuleListRefreshKey] = useState(0);
  
  // PDF-to-schedule state
  const [pdfExtractionId, setPdfExtractionId] = useState<number | undefined>();
  const [filteredRaces, setFilteredRaces] = useState<any[] | undefined>();
  const [competitorData, setCompetitorData] = useState<any | undefined>();
  
  // PDF processor state
  const [selectedPDFExtraction, setSelectedPDFExtraction] = useState<any | undefined>();
  const [pdfListRefreshKey, setPdfListRefreshKey] = useState(0);
  
  // Ref to hold the addRaceToSchedule function from ScheduleBuilder
  const addRaceToScheduleRef = useRef<((race: RaceWithAgeGroupsAndBoatClass, level: Level) => void) | null>(null);
  
  // Ref to hold the populateSectionDataMap function from ScheduleBuilder
  const populateSectionDataMapRef = useRef<((loadedSectionDataMap: Map<number, SectionWorkingData>) => void) | null>(null);

  // Unsaved changes management
  const {
    showConfirmDialog,
    unsavedChangesType,
    canSave,
    setUnsavedChanges,
    requestNavigation,
    handleSaveAndExit,
    handleExitWithoutSaving,
    handleCancelNavigation
  } = useUnsavedChanges();

  useEffect(() => {
    // Only initialize schedule when entering create-schedule view
    if (currentView === 'create-schedule' && !schedule) {
      initializeSchedule();
    }
  }, [currentView]);

  // Initialize with a default schedule
  const initializeSchedule = async () => {
    try {
      console.log('=== SCHEDULE INITIALIZATION DEBUG ===');
      
      const defaultSectionId = Date.now();
      const defaultSchedule: ScheduleWithSections = {
        id: -1, // Use -1 for temporary in-memory schedules
        name: 'Új időrend',
        pdfExtractionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        sections: [
          {
            id: defaultSectionId, // Use timestamp for unique temporary ID
            scheduleId: -1, // Match the schedule ID
            dayNumber: 1,
            sectionType: 'délelőtt',
            startTime: '09:00',
            createdAt: new Date()
          }
        ]
      };
      
      console.log('Created default schedule:', defaultSchedule);
      console.log('Default section properties:');
      console.log('  id:', defaultSectionId, typeof defaultSectionId);
      console.log('  dayNumber:', 1, typeof 1);
      console.log('  sectionType:', 'délelőtt', typeof 'délelőtt');
      console.log('  startTime:', '09:00', typeof '09:00');
      
      setSchedule(defaultSchedule);
      setCurrentSectionId(defaultSectionId);
      
      console.log('Schedule initialization completed');
    } catch (error) {
      console.error('Failed to initialize schedule:', error);
    }
  };

  const handleRaceAdd = (race: RaceWithAgeGroupsAndBoatClass, level: Level) => {
    if (addRaceToScheduleRef.current) {
      addRaceToScheduleRef.current(race, level);
    }
  };

  const handlePopulateSectionDataRef = (fn: (loadedSectionDataMap: Map<number, SectionWorkingData>) => void) => {
    populateSectionDataMapRef.current = fn;
  };

  const handleScheduleRacesChange = (races: ScheduleRace[]) => {
    setScheduleRaces(races);
  };

  const handleSectionChange = (sectionId: number) => {
    if (sectionId !== currentSectionId) {
      setCurrentSectionId(sectionId);
    }
  };

  const handleSectionAdd = async (sectionData: CreateScheduleSectionData) => {
    try {
      console.log('=== SECTION ADD DEBUG: Changed to see that rebuild happened ===');
      console.log('Adding section with data:', sectionData);
      
      // Add section to schedule
      if (schedule) {
        const newSection: ScheduleSection = {
          id: Date.now() + Math.random(), // Ensure unique temporary ID
          scheduleId: sectionData.scheduleId,
          dayNumber: sectionData.dayNumber,
          sectionType: sectionData.sectionType,
          startTime: sectionData.startTime,
          createdAt: new Date()
        };
        
        console.log('Created new section object:', newSection);
        console.log('Section properties check:');
        console.log('  id:', newSection.id, typeof newSection.id);
        console.log('  dayNumber:', newSection.dayNumber, typeof newSection.dayNumber);
        console.log('  sectionType:', newSection.sectionType, typeof newSection.sectionType);
        console.log('  startTime:', newSection.startTime, typeof newSection.startTime);

        setSchedule(prev => {
          if (prev) {
            const updatedSchedule = {
              ...prev,
              sections: [...prev.sections, newSection]
            };
            console.log('Updated schedule after section add:', updatedSchedule);
            return updatedSchedule;
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to add section:', error);
    }
  };

  const handleSectionRemove = async (sectionId: number) => {
    try {
      if (schedule) {
        setSchedule(prev => prev ? {
          ...prev,
          sections: prev.sections.filter(s => s.id !== sectionId)
        } : prev);

        // If we removed the current section, switch to the first available section
        if (currentSectionId === sectionId) {
          const remainingSections = schedule.sections.filter(s => s.id !== sectionId);
          if (remainingSections.length > 0) {
            setCurrentSectionId(remainingSections[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to remove section:', error);
    }
  };

  const handleSectionStartTimeChange = async (sectionId: number, startTime: string) => {
    try {
      if (schedule) {
        setSchedule(prev => prev ? {
          ...prev,
          sections: prev.sections.map(s => 
            s.id === sectionId ? { ...s, startTime: startTime } : s
          )
        } : prev);
      }
    } catch (error) {
      console.error('Failed to update section start time:', error);
    }
  };

  // Navigation handlers
  const handleCreateNewSchedule = () => {
    setCurrentView('select-mode');
  };

  const handleModeSelect = (mode: ScheduleMode) => {
    setScheduleMode(mode);
    setCurrentView('create-schedule');
  };

  const handleLoadSchedule = () => {
    setCurrentView('load-schedule');
  };

  const handleBackToMainMenu = () => {
    requestNavigation(() => {
      setCurrentView('main-menu');
      // Clear any schedule or rule state when going to main menu
      setSchedule(undefined);
      setEditingRule(undefined);
      setPdfExtractionId(undefined);
      setFilteredRaces(undefined);
      setCompetitorData(undefined);
      setScheduleRaces([]);
      // Clear unsaved changes state
      setUnsavedChanges(false);
    });
  };


  const handleRuleManagement = () => {
    setCurrentView('rule-management');
  };

  const handlePDFProcessor = () => {
    setCurrentView('pdf-processor');
  };

  const handlePDFToSchedule = async (pdfExtractionId: number, filteredRaces: any[], competitorData: any) => {
    console.log('Navigating to PDF-to-schedule with:', { pdfExtractionId, filteredRaces: filteredRaces.length, competitorData });

    // Store PDF data - set all state first
    setPdfExtractionId(pdfExtractionId);
    setFilteredRaces(filteredRaces);
    setCompetitorData(competitorData);
    setScheduleMode('full');

    // Initialize schedule for PDF workflow and wait for it to complete
    await initializeSchedule();

    // Only change view after schedule is initialized and all state is set
    // This ensures ScheduleBuilder mounts with all required props
    setCurrentView('pdf-to-schedule');
  };

  const handleCreateRule = () => {
    setEditingRule(undefined); // Clear any existing editing state
    setCurrentView('rule-editor');
  };

  const handleEditRule = (rule: RuleWithConditions) => {
    setEditingRule(rule);
    setCurrentView('rule-editor');
  };

  const handleSaveRule = async (ruleData: CreateRuleData) => {
    try {
      if (editingRule) {
        // Update existing rule
        await window.electronAPI.updateRule(editingRule.id, ruleData);
      } else {
        // Create new rule
        await window.electronAPI.createRule(ruleData);
      }
      
      // Immediately clear unsaved changes state after successful save
      setUnsavedChanges(false);
      
      // Trigger refresh of rule list
      setRuleListRefreshKey(prev => prev + 1);
      
      // Navigate back to rule management
      setEditingRule(undefined);
      setCurrentView('rule-management');
    } catch (error) {
      console.error('Error saving rule:', error);
      throw error; // Re-throw so RuleEditor can handle the error display
    }
  };

  const handleCancelRuleEdit = () => {
    setEditingRule(undefined);
    setCurrentView('rule-management');
  };

  const handleScheduleSelected = async (selectedSchedule: Schedule) => {
    try {
      console.log('Loading selected schedule:', selectedSchedule);
      
      // Load schedule with PDF context and complete schedule items
      const { schedule, pdfExtractionId, hasPDFData } = await window.electronAPI.getScheduleWithPDFContext(selectedSchedule.id);
      
      if (!schedule) {
        console.error('Failed to load schedule');
        return;
      }
      
      // Set the loaded schedule
      setSchedule(schedule);
      
      // Transform loaded schedule data to working memory format
      const loadedSectionDataMap = new Map<number, SectionWorkingData>();
      
      schedule.sections.forEach(section => {
        console.log(`Transforming section ${section.id} (${section.dayNumber} ${section.sectionType})`);
        console.log(`Section items:`, (section as any).items);
        
        // Transform schedule items to ScheduleRace format
        const scheduleRaces: ScheduleRace[] = ((section as any).items || []).map((item: any, index: number) => ({
          id: `schedule-race-${item.id}`,
          race: item.race,
          level: item.level,
          day: section.dayNumber,
          startTime: item.calculatedStartTime || '09:00',
          order: item.orderIndex || index
        }));
        
        // Extract intervals from intervalMinutes
        const intervals: number[] = ((section as any).items || []).map((item: any) => item.intervalMinutes || 15);
        
        // Determine default interval (use most common interval or fallback to 15)
        const defaultInterval = intervals.length > 0 
          ? intervals.reduce((a, b, _, arr) => 
              arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
            ) || 15
          : 15;
        
        // Create SectionWorkingData
        const sectionWorkingData: SectionWorkingData = {
          sectionId: section.id,
          races: scheduleRaces,
          intervals: intervals,
          settings: {
            startTime: section.startTime,
            defaultInterval: defaultInterval
          },
          day: section.dayNumber
        };
        
        loadedSectionDataMap.set(section.id, sectionWorkingData);
        console.log(`Section ${section.id} transformed:`, sectionWorkingData);
      });
      
      // Set the first section as current
      if (schedule.sections.length > 0) {
        setCurrentSectionId(schedule.sections[0].id);
      }
      
      console.log('Complete section data map:', loadedSectionDataMap);
      
      // If schedule has PDF data, restore the competitor-aware context
      if (hasPDFData && pdfExtractionId) {
        console.log(`Restoring PDF context for schedule ${schedule.id} (PDF extraction: ${pdfExtractionId})`);

        try {
          // Load filtered races and competitor data
          const [filteredRaces, competitorData] = await Promise.all([
            window.electronAPI.pdfGetFilteredRaces(pdfExtractionId),
            window.electronAPI.pdfGetCompetitorData(pdfExtractionId)
          ]);

          // Validate that we actually received meaningful PDF data
          const hasValidRaceData = Array.isArray(filteredRaces) && filteredRaces.length > 0;
          const hasValidCompetitorData = competitorData && typeof competitorData === 'object' && Object.keys(competitorData).length > 0;

          if (hasValidRaceData && hasValidCompetitorData) {
            // Success: Set PDF context for competitor-aware features
            setPdfExtractionId(pdfExtractionId);
            setFilteredRaces(filteredRaces);
            setCompetitorData(competitorData);
            setScheduleMode('full');

            console.log(`✅ PDF context restored: ${filteredRaces.length} filtered races, ${Object.keys(competitorData).length} competitors`);
            toast.success(`PDF adatok visszaállítva: ${filteredRaces.length} versenyszám, versenyző-tudatos üzemmód aktív`, {
              duration: 4000
            });
          } else {
            // Partial failure: Got empty data
            console.warn(`⚠️ PDF context restoration failed - empty data received:`, {
              racesCount: filteredRaces?.length || 0,
              competitorCount: competitorData ? Object.keys(competitorData).length : 0
            });

            // Fall back to standard mode
            setPdfExtractionId(undefined);
            setFilteredRaces(undefined);
            setCompetitorData(undefined);
            setScheduleMode('full');

            toast.warning('PDF adatok nem állíthatók vissza - üres adatok. Standard üzemmód aktív.', {
              description: 'Az időrend betöltődött, de a PDF adatok elvesztek. Továbbra is szerkeszthető.',
              duration: 6000
            });
          }
        } catch (error) {
          // Complete failure: API calls failed
          console.error('❌ PDF context restoration failed:', error);

          // Fall back to standard mode
          setPdfExtractionId(undefined);
          setFilteredRaces(undefined);
          setCompetitorData(undefined);
          setScheduleMode('full');

          toast.error('PDF adatok visszaállítása sikertelen', {
            description: 'Az időrend betöltődött, de a PDF funkciók nem érhetők el. Próbálja újra feldolgozni a PDF-et.',
            duration: 8000
          });
        }
      } else {
        // Clear PDF context for standard scheduling mode
        setPdfExtractionId(undefined);
        setFilteredRaces(undefined);
        setCompetitorData(undefined);
        setScheduleMode('full');

        console.log('Standard scheduling mode - no PDF data linked');
      }
      
      // Navigate to schedule builder
      setCurrentView('create-schedule');
      
      // Populate the section data map after ScheduleBuilder is mounted
      // Use setTimeout to ensure the component and hook are ready
      setTimeout(() => {
        if (populateSectionDataMapRef.current) {
          console.log('Populating section data map with loaded data...');
          populateSectionDataMapRef.current(loadedSectionDataMap);
        } else {
          console.warn('populateSectionDataMapRef not ready, schedule races may not be loaded properly');
        }
      }, 100);
      
    } catch (error) {
      console.error('Error loading schedule:', error);
      // Still navigate to create-schedule view but without PDF context
      setCurrentView('create-schedule');
    }
  };

  // Save schedule with all sections data
  const handleScheduleSave = async (schedule: ScheduleWithSections, scheduleName: string, sectionData: Map<number, SectionWorkingData>, pdfExtractionId?: number) => {
    try {
      console.log('=== SAVE DEBUG START ===');
      console.log('Original schedule:', schedule);
      console.log('Schedule sections:', schedule.sections);
      console.log('Section data map:', sectionData);
      console.log('Section data map size:', sectionData.size);
      console.log('Section data map keys:', Array.from(sectionData.keys()));
      
      // Convert section data map to database format
      const sectionDataArray = schedule.sections.map((section, index) => {
        console.log(`\n--- Processing section ${index} ---`);
        console.log('Section ID:', section.id);
        console.log('Section object:', section);
        console.log('Section dayNumber:', section.dayNumber, typeof section.dayNumber);
        console.log('Section sectionType:', section.sectionType, typeof section.sectionType);
        console.log('Section startTime:', section.startTime, typeof section.startTime);
        
        const workingData = sectionData.get(section.id);
        console.log('Working data lookup result:', workingData);
        console.log('Has working data:', !!workingData);
        
        const races = workingData?.races || [];
        console.log('Races count:', races.length);
        
        const convertedSection = {
          dayNumber: section.dayNumber,
          sectionType: section.sectionType as 'délelőtt' | 'délután',
          startTime: workingData?.settings.startTime || section.startTime,
          items: races.map((sr, index) => ({
            raceId: sr.race.id,
            levelId: sr.level.id,
            orderIndex: index,
            intervalMinutes: workingData?.intervals[index] || workingData?.settings.defaultInterval || 15,
            notes: undefined
          }))
        };
        
        console.log('Converted section:', convertedSection);
        return convertedSection;
      });
      
      console.log('\n=== FINAL CONVERTED DATA ===');
      console.log('Final sectionDataArray:', sectionDataArray);
      console.log('JSON.stringify result:', JSON.stringify(sectionDataArray, null, 2));

      // Validate data before sending to backend
      const hasInvalidData = sectionDataArray.some(section => 
        section.dayNumber === undefined || 
        section.sectionType === undefined || 
        section.startTime === undefined ||
        typeof section.sectionType !== 'string' ||
        typeof section.startTime !== 'string' ||
        typeof section.dayNumber !== 'number'
      );
      
      if (hasInvalidData) {
        console.error('INVALID DATA DETECTED! Cannot save to database.');
        console.error('Problematic sections:');
        sectionDataArray.forEach((section, index) => {
          if (section.dayNumber === undefined || section.sectionType === undefined || section.startTime === undefined) {
            console.error(`Section ${index}:`, section);
          }
        });
        throw new Error('Invalid section data: undefined values detected');
      }

      console.log('Data validation passed, sending to backend...');
      console.log('Using schedule name from UI:', scheduleName);
      
      let scheduleId: number;
      
      // Decide between create (new schedule) vs update (existing schedule)
      if (schedule.id === -1) {
        // New schedule - create in database
        console.log('Creating new schedule:', scheduleName);
        scheduleId = await window.electronAPI.saveScheduleWithSections(
          scheduleName,  // Use the name from UI, not schedule.name
          sectionDataArray,
          pdfExtractionId  // Link PDF data if provided
        );
        console.log('New schedule created with ID:', scheduleId);
        
        // Update the schedule with the real ID and name
        setSchedule(prev => prev ? { ...prev, id: scheduleId, name: scheduleName } : prev);
      } else {
        // Existing schedule - update in database
        console.log('Updating existing schedule ID:', schedule.id, 'with name:', scheduleName);
        scheduleId = await window.electronAPI.updateScheduleWithSections(
          schedule.id,
          scheduleName,  // Use the name from UI, not schedule.name
          sectionDataArray,
          pdfExtractionId  // Link PDF data if provided
        );
        console.log('Schedule updated successfully');
        
        // Update the schedule name in state
        setSchedule(prev => prev ? { ...prev, name: scheduleName } : prev);
      }
      
      // Clear unsaved changes state after successful save
      setUnsavedChanges(false);
      
      // Log the PDF linking result
      if (pdfExtractionId) {
        console.log(`Schedule ${scheduleId} linked to PDF extraction ${pdfExtractionId} - competitor-aware features preserved`);
      }

      console.log('Schedule saved successfully with ID:', scheduleId);
    } catch (error) {
      console.error('Failed to save schedule:', error);
      throw error; // Re-throw so ScheduleBuilder can handle the error display
    }
  };

  // Render different views based on current navigation state
  const renderCurrentView = () => {
    switch (currentView) {
      case 'main-menu':
        return (
          <MainMenu
            onCreateNewSchedule={handleCreateNewSchedule}
            onLoadSchedule={handleLoadSchedule}
            onRuleManagement={handleRuleManagement}
            onPDFProcessor={handlePDFProcessor}
          />
        );

      case 'select-mode':
        return (
          <ScheduleModeSelector
            onModeSelect={handleModeSelect}
            onBack={handleBackToMainMenu}
          />
        );

      case 'load-schedule':
        return (
          <div className="h-screen flex flex-col">
            <Navbar currentView={currentView} onNavigateHome={handleBackToMainMenu} />
            <div className="flex-1 min-h-0">
              <ScheduleSelection
                onScheduleSelected={handleScheduleSelected}
                onCreateNewSchedule={handleCreateNewSchedule}
              />
            </div>
          </div>
        );

      case 'rule-management':
      case 'rule-editor':
        return (
          <div className="h-screen flex flex-col">
            <Navbar currentView={currentView} onNavigateHome={handleBackToMainMenu} />
            <div className="flex-1 min-h-0">
              <RuleManager
                refreshTrigger={ruleListRefreshKey}
                onCreateRule={handleCreateRule}
                onEditRule={handleEditRule}
                selectedRule={editingRule}
              >
                {currentView === 'rule-editor' && (
                  <RuleEditor
                    rule={editingRule}
                    onSave={handleSaveRule}
                    onCancel={handleCancelRuleEdit}
                    compact
                    onUnsavedChanges={setUnsavedChanges}
                  />
                )}
              </RuleManager>
            </div>
          </div>
        );

      case 'create-schedule':
        return (
          <div className="h-screen flex flex-col">
            <Navbar currentView={currentView} onNavigateHome={handleBackToMainMenu} />
            <div className="flex-1 min-h-0">
              <TwoPanelLayout>
                <TwoPanelLayout.SidePanel>
                  <RaceList
                    onRaceAdd={handleRaceAdd}
                    scheduleRaces={scheduleRaces}
                    scheduleMode={scheduleMode}
                    // Include PDF-related props if we have PDF data
                    filteredRaces={pdfExtractionId ? filteredRaces : undefined}
                    raceSource={pdfExtractionId ? "pdf-filtered" : undefined}
                    pdfExtractionId={pdfExtractionId}
                  />
                </TwoPanelLayout.SidePanel>
                <TwoPanelLayout.MainPanel>
                  <ScheduleBuilder
                    onScheduleRacesChange={handleScheduleRacesChange}
                    onRaceAddRefUpdate={(fn) => { addRaceToScheduleRef.current = fn; }}
                    onPopulateSectionDataRefUpdate={handlePopulateSectionDataRef}
                    schedule={schedule}
                    currentSectionId={currentSectionId}
                    onSectionChange={handleSectionChange}
                    onSectionAdd={handleSectionAdd}
                    onSectionRemove={handleSectionRemove}
                    onSectionStartTimeChange={handleSectionStartTimeChange}
                    onScheduleSave={handleScheduleSave}
                    scheduleMode={scheduleMode}
                    // Include PDF-related props if we have PDF data
                    pdfExtractionId={pdfExtractionId}
                    competitorData={competitorData}
                    onUnsavedChanges={setUnsavedChanges}
                  />
                </TwoPanelLayout.MainPanel>
              </TwoPanelLayout>
            </div>
          </div>
        );

      case 'pdf-processor':
        return (
          <div className="h-screen flex flex-col">
            <Navbar currentView={currentView} onNavigateHome={handleBackToMainMenu} />
            <div className="flex-1 min-h-0">
              <PDFProcessor
                onNavigateToSchedule={handlePDFToSchedule}
              />
            </div>
          </div>
        );

      case 'pdf-to-schedule':
        return (
          <div className="h-screen flex flex-col">
            <Navbar currentView={currentView} onNavigateHome={handleBackToMainMenu} />
            <div className="flex-1 min-h-0">
              <TwoPanelLayout>
                <TwoPanelLayout.SidePanel>
                  <RaceList 
                    onRaceAdd={handleRaceAdd}
                    scheduleRaces={scheduleRaces}
                    scheduleMode={scheduleMode}
                    filteredRaces={filteredRaces}
                    raceSource="pdf-filtered"
                    pdfExtractionId={pdfExtractionId}
                  />
                </TwoPanelLayout.SidePanel>
                <TwoPanelLayout.MainPanel>
                  <ScheduleBuilder 
                    onScheduleRacesChange={handleScheduleRacesChange}
                    onRaceAddRefUpdate={(fn) => { addRaceToScheduleRef.current = fn; }}
                    onPopulateSectionDataRefUpdate={handlePopulateSectionDataRef}
                    schedule={schedule}
                    currentSectionId={currentSectionId}
                    onSectionChange={handleSectionChange}
                    onSectionAdd={handleSectionAdd}
                    onSectionRemove={handleSectionRemove}
                    onSectionStartTimeChange={handleSectionStartTimeChange}
                    onScheduleSave={handleScheduleSave}
                    scheduleMode={scheduleMode}
                    pdfExtractionId={pdfExtractionId}
                    competitorData={competitorData}
                    onUnsavedChanges={setUnsavedChanges}
                  />
                </TwoPanelLayout.MainPanel>
              </TwoPanelLayout>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderCurrentView()}
      <Toaster />
      <UnsavedChangesDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelNavigation}
        onSaveAndExit={handleSaveAndExit}
        onExitWithoutSaving={handleExitWithoutSaving}
        canSave={canSave}
        title={unsavedChangesType === 'rule' ? 'Mentetlen szabály módosítások' : 'Mentetlen időrend módosítások'}
        description={
          unsavedChangesType === 'rule' 
            ? 'A szabályban mentetlen módosítások vannak. Biztosan el szeretné hagyni a szerkesztőt?'
            : 'Az időrendben mentetlen módosítások vannak. Biztosan el szeretné hagyni a szerkesztőt?'
        }
        saveLabel={unsavedChangesType === 'rule' ? 'Szabály mentése és kilépés' : 'Időrend mentése és kilépés'}
      />
    </>
  );
};

export default App;