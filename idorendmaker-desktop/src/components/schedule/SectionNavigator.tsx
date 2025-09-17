import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ScheduleSection, SectionNavigationState } from '../../../shared/types/race';

interface SectionNavigatorProps {
  sections: ScheduleSection[];
  currentSectionId?: number;
  onSectionChange: (sectionId: number) => void;
  className?: string;
}

const SectionNavigator: React.FC<SectionNavigatorProps> = ({
  sections,
  currentSectionId,
  onSectionChange,
  className = ''
}) => {
  // Calculate navigation state
  const navigationState = useMemo((): SectionNavigationState & { 
    currentSectionIndex: number,
    currentSection?: ScheduleSection 
  } => {
    const currentIndex = sections.findIndex(s => s.id === currentSectionId);
    const currentSection = sections[currentIndex];
    
    const maxDay = Math.max(...sections.map(s => s.dayNumber), 0);
    
    return {
      current_day: currentSection?.dayNumber || 1,
      current_section: (currentSection?.sectionType || 'délelőtt') as 'délelőtt' | 'délután',
      total_days: maxDay,
      currentSectionIndex: currentIndex,
      currentSection
    };
  }, [sections, currentSectionId]);

  // Get sections grouped by day for easy navigation
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

  const canNavigatePrevious = navigationState.currentSectionIndex > 0;
  const canNavigateNext = navigationState.currentSectionIndex < sections.length - 1;

  const handlePreviousSection = () => {
    if (canNavigatePrevious) {
      const previousSection = sections[navigationState.currentSectionIndex - 1];
      onSectionChange(previousSection.id);
    }
  };

  const handleNextSection = () => {
    if (canNavigateNext) {
      const nextSection = sections[navigationState.currentSectionIndex + 1];
      onSectionChange(nextSection.id);
    }
  };

  const handleDayChange = (dayNumber: number) => {
    const daySections = sectionsByDay.get(dayNumber);
    if (daySections && daySections.length > 0) {
      // Default to the first section of the day (usually délelőtt)
      onSectionChange(daySections[0].id);
    }
  };

  const handleSectionTypeChange = (sectionType: 'délelőtt' | 'délután') => {
    const currentDay = navigationState.current_day;
    const daySections = sectionsByDay.get(currentDay);
    if (daySections) {
      const targetSection = daySections.find(s => s.sectionType === sectionType);
      if (targetSection) {
        onSectionChange(targetSection.id);
      }
    }
  };

  if (sections.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-2">
          <div className="text-center text-muted-foreground text-sm">
            Még nincsenek szakaszok
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-2">
        <div className="flex items-center justify-between gap-2">
          {/* Previous Section Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousSection}
            disabled={!canNavigatePrevious}
            className="h-8 w-8 p-0"
            title="Előző szakasz"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Current Section Display */}
          <div className="flex-1 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium">
                {navigationState.current_day}. nap
              </span>
            </div>
            
            <div className="flex gap-1">
              {/* Délelőtt button */}
              <Button
                variant={navigationState.current_section === 'délelőtt' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSectionTypeChange('délelőtt')}
                disabled={!sectionsByDay.get(navigationState.current_day)?.some(s => s.sectionType === 'délelőtt')}
                className="h-5 px-1 text-xs"
              >
                Délelőtt
              </Button>
              
              {/* Délután button */}
              <Button
                variant={navigationState.current_section === 'délután' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSectionTypeChange('délután')}
                disabled={!sectionsByDay.get(navigationState.current_day)?.some(s => s.sectionType === 'délután')}
                className="h-5 px-1 text-xs"
              >
                Délután
              </Button>
            </div>

            {/* Start time display */}
            {navigationState.currentSection && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {navigationState.currentSection.startTime}
                </span>
              </div>
            )}
          </div>

          {/* Next Section Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextSection}
            disabled={!canNavigateNext}
            className="h-8 w-8 p-0"
            title="Következő szakasz"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day navigation for multiple days */}
        {navigationState.total_days > 1 && (
          <div className="mt-1 flex justify-center gap-1">
            {Array.from({ length: navigationState.total_days }, (_, i) => i + 1).map(dayNum => (
              <Button
                key={dayNum}
                variant={dayNum === navigationState.current_day ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDayChange(dayNum)}
                className="h-4 w-6 p-0 text-xs"
              >
                {dayNum}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SectionNavigator;