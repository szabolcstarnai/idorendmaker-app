import React, { useState, useCallback } from 'react';
import { RaceWithAgeGroupsAndBoatClass, Level } from '../../../shared/types/race';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ChevronDown } from 'lucide-react';
import TruncatedText from '../common/TruncatedText';

interface LevelSelectorModalProps {
  race: RaceWithAgeGroupsAndBoatClass | null;
  availableLevels: Level[];
  isOpen: boolean;
  onClose: () => void;
  onLevelSelect: (race: RaceWithAgeGroupsAndBoatClass, level: Level) => void;
}

/**
 * Modal component for selecting competitive levels when adding races to schedule
 * Shows available levels for a specific race and allows user to choose multiple levels
 * Selected levels are added to schedule in competitive progression order (előfutam → középfutam → döntő)
 */
export const LevelSelectorModal: React.FC<LevelSelectorModalProps> = ({
  race,
  availableLevels,
  isOpen,
  onClose,
  onLevelSelect
}) => {
  // Multi-select state management
  const [selectedLevelIds, setSelectedLevelIds] = useState<Set<number>>(new Set());
  
  // Collapsible state - all sections open by default
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Reset selection when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedLevelIds(new Set());
    }
  }, [isOpen]);

  // Toggle section collapse
  const toggleSectionCollapse = useCallback((sectionType: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionType)) {
        newSet.delete(sectionType);
      } else {
        newSet.add(sectionType);
      }
      return newSet;
    });
  }, []);

  // Toggle level selection
  const toggleLevelSelection = useCallback((levelId: number) => {
    setSelectedLevelIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(levelId)) {
        newSet.delete(levelId);
      } else {
        newSet.add(levelId);
      }
      return newSet;
    });
  }, []);

  // Select all available levels
  const selectAllLevels = useCallback(() => {
    setSelectedLevelIds(new Set(availableLevels.map(level => level.id)));
  }, [availableLevels]);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedLevelIds(new Set());
  }, []);

  // Handle adding selected levels to schedule
  const handleAddSelectedLevels = useCallback(() => {
    if (!race || selectedLevelIds.size === 0) return;

    // Get selected levels and sort by sortOrder
    const selectedLevels = availableLevels
      .filter(level => selectedLevelIds.has(level.id))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Add each level to schedule in correct order
    selectedLevels.forEach(level => {
      onLevelSelect(race, level);
    });

    // Close modal and reset selections
    onClose();
  }, [race, selectedLevelIds, availableLevels, onLevelSelect, onClose]);

  const getLevelTypeColor = (levelType: string) => {
    switch (levelType) {
      case 'döntő': return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'előfutam': return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'középfutam': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getLevelTypeRingColor = (levelType: string) => {
    switch (levelType) {
      case 'döntő': return 'ring-blue-500';
      case 'előfutam': return 'ring-green-500';
      case 'középfutam': return 'ring-yellow-500';
      default: return 'ring-gray-500';
    }
  };

  const getLevelTypeCheckboxColor = (levelType: string) => {
    switch (levelType) {
      case 'döntő': return 'data-[state=checked]:bg-blue-600 border-blue-600';
      case 'előfutam': return 'data-[state=checked]:bg-green-600 border-green-600';
      case 'középfutam': return 'data-[state=checked]:bg-yellow-600 border-yellow-600';
      default: return 'data-[state=checked]:bg-gray-600 border-gray-600';
    }
  };

  const getLevelTypeLabel = (levelType: string) => {
    switch (levelType) {
      case 'döntő': return 'Döntő';
      case 'előfutam': return 'Előfutam';
      case 'középfutam': return 'Középfutam';
      default: return levelType;
    }
  };

  // Group levels by type for better organization
  const groupedLevels = availableLevels.reduce((groups, level) => {
    const type = level.levelType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(level);
    return groups;
  }, {} as Record<string, Level[]>);

  // Order by competitive progression: előfutam, középfutam, döntő
  const orderedGroups = [
    { type: 'előfutam', levels: groupedLevels['előfutam'] || [] },
    { type: 'középfutam', levels: groupedLevels['középfutam'] || [] },
    { type: 'döntő', levels: groupedLevels['döntő'] || [] }
  ].filter(group => group.levels.length > 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl w-[90vw] max-h-[90vh] flex flex-col">
        <AlertDialogHeader className="flex-shrink-0">
          <AlertDialogTitle>Futamszint kiválasztása</AlertDialogTitle>
          {race && (
            <div className="mb-4">
              <div className="font-medium text-foreground">{race.name}</div>
            </div>
          )}
          <AlertDialogDescription>
            Olyan futamszintek az adott futamhoz, amelyek még nem szerepelnek az időrendben.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="max-h-[50vh] overflow-auto">
            <div className="space-y-3 pr-3 pl-1">
              {orderedGroups.map(({ type, levels }) => {
                const isCollapsed = collapsedSections.has(type);
                return (
                  <Collapsible 
                    key={type} 
                    open={!isCollapsed}
                    onOpenChange={() => toggleSectionCollapse(type)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 mb-3 mt-2 hover:bg-muted/30 p-2 rounded-md transition-colors">
                        <Badge variant="outline" className={`${getLevelTypeColor(type)} border-2`}>
                          {getLevelTypeLabel(type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium">
                          {levels.length} elérhető
                        </span>
                        <ChevronDown 
                          className={`h-4 w-4 ml-auto transition-transform ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`} 
                        />
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="grid grid-cols-2 gap-3 px-2">
                        {levels.map((level) => {
                          const isSelected = selectedLevelIds.has(level.id);
                          const baseColors = getLevelTypeColor(type);
                          const ringColor = getLevelTypeRingColor(type);
                          const checkboxColor = getLevelTypeCheckboxColor(type);
                          return (
                            <div
                              key={level.id}
                              className={`border rounded-md p-3 cursor-pointer transition-all min-w-0 ${baseColors} ${
                                isSelected 
                                  ? `ring-2 ${ringColor} ring-offset-2 ${baseColors.replace('hover:bg-', 'bg-')}` 
                                  : 'hover:shadow-sm'
                              }`}
                              onClick={() => toggleLevelSelection(level.id)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleLevelSelection(level.id)}
                                  className={`shrink-0 ${checkboxColor}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <TruncatedText as="div" className="font-medium text-sm">{level.name}</TruncatedText>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex flex-col gap-3 pt-4 flex-shrink-0">
          {/* Selection info */}
          <div className="text-sm text-muted-foreground text-center">
            {selectedLevelIds.size === 0 
              ? "Válasszon ki legalább egy futamszintet"
              : `${selectedLevelIds.size} futamszint kiválasztva`
            }
          </div>
          
          {/* Action buttons */}
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAllLevels}
                disabled={selectedLevelIds.size === availableLevels.length}
              >
                Mind kiválaszt
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearAllSelections}
                disabled={selectedLevelIds.size === 0}
              >
                Kiválasztás törlése
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Mégse
              </Button>
              <Button 
                onClick={handleAddSelectedLevels}
                disabled={selectedLevelIds.size === 0}
              >
                Hozzáadás ({selectedLevelIds.size})
              </Button>
            </div>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};