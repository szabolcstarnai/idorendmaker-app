import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Eye, EyeOff, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { RaceWithAgeGroups, RaceWithCompetitorData, ScheduleRace, Level, ScheduleMode } from '../../../shared/types/race';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { LegacyCollapsible } from '../ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { LevelSelectorModal } from './LevelSelectorModal';
import { getAvailableLevels, getAddedLevels, getRaceLevelCombinations, getAvailableLevelsForMode } from '../../utils/levelUtils';
import { TabbedPanelLoading } from '../ui/loading';

interface RaceListProps {
  onRaceAdd?: (race: RaceWithAgeGroups, level: Level) => void;
  scheduleRaces?: ScheduleRace[];
  scheduleMode?: ScheduleMode;
  // New props for filtered race support
  filteredRaces?: RaceWithCompetitorData[]; // When provided, use instead of loading from database
  raceSource?: 'database' | 'pdf-filtered'; // Indicates the source of races
  pdfExtractionId?: number; // For loading competitor data
}

// Memoized race card component for better performance
const RaceCard = React.memo(({ race, onRaceClick, onToggleHidden, showAddButton = true, availableLevelsCount = 0, addedLevelsCount = 0, activeTab = 'all', scheduleMode = 'full', entryCount, topCompetitors }: {
  race: RaceWithAgeGroups;
  onRaceClick?: (race: RaceWithAgeGroups) => void;
  onToggleHidden: (race: RaceWithAgeGroups, event: React.MouseEvent) => void;
  showAddButton?: boolean;
  availableLevelsCount?: number;
  addedLevelsCount?: number;
  activeTab?: string;
  scheduleMode?: ScheduleMode;
  entryCount?: number; // Number of competitor entries (from PDF)
  topCompetitors?: string[]; // Sample competitor names
}) => {
  const getDisciplineVariant = useCallback((discipline: string) => {
    switch (discipline) {
      case 'Kajak': return 'default' as const;
      case 'Kenu': return 'secondary' as const;
      case 'SUP': return 'destructive' as const;
      default: return 'outline' as const;
    }
  }, []);

  const getGenderVariant = useCallback((gender: string) => {
    switch (gender) {
      case 'Férfi': return 'default' as const;
      case 'Női': return 'secondary' as const;
      case 'Vegyes': return 'destructive' as const;
      default: return 'outline' as const;
    }
  }, []);

  return (
    <Card
      className={`transition-all hover:shadow-md hover:border-primary/50 group relative ${race.hidden ? 'opacity-60 border-dashed' : ''
        }`}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-sm">
            {race.name}
            {entryCount !== undefined && (
              <span className="text-green-600 font-semibold ml-1">
                ({entryCount} nevezés)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {race.hidden && <EyeOff className="w-4 h-4 text-muted-foreground" />}
            {onRaceClick && showAddButton && availableLevelsCount > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRaceClick(race);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-green-600 hover:text-green-700"
                title={availableLevelsCount === 1 ? "Hozzáadás az időrendhez" : "Futamszint kiválasztása"}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => onToggleHidden(race, e)}
              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted ${race.hidden ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'
                }`}
              title={race.hidden ? 'Megjelenítés' : 'Elrejtés'}
            >
              {race.hidden ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          <Badge variant={getDisciplineVariant(race.discipline)} className="text-xs">
            {race.discipline}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {race.boatClass}
          </Badge>
          <Badge variant={getGenderVariant(race.gender)} className="text-xs">
            {race.gender}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {race.distance}
          </Badge>
        </div>

        {/* Competitor information from PDF */}
        {topCompetitors && topCompetitors.length > 0 && (
          <div className="text-xs text-blue-600 mb-1">
            <span className="font-medium">Nevezettek: </span>
            {topCompetitors.join(', ')}
            {entryCount && topCompetitors.length < entryCount && (
              <span className="text-muted-foreground"> +{entryCount - topCompetitors.length} más</span>
            )}
          </div>
        )}

        {race.ageGroups.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {race.ageGroups.map(ag => ag.name).join(', ')}
          </div>
        )}

        {/* Level status indicators - ONLY visible on "Felvett versenyszámok" tab in full mode */}
        {scheduleMode === 'full' && activeTab === 'added' && (addedLevelsCount > 0 || availableLevelsCount > 0) && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
            {addedLevelsCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {addedLevelsCount} hozzáadva
              </Badge>
            )}
            {availableLevelsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {availableLevelsCount} elérhető
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const RaceList: React.FC<RaceListProps> = React.memo(({
  onRaceAdd,
  scheduleRaces = [],
  scheduleMode = 'full',
  filteredRaces,
  raceSource = 'database',
  pdfExtractionId
}) => {
  const [races, setRaces] = useState<RaceWithAgeGroups[]>([]);
  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // Show 50 races per page

  // Level selector modal state
  const [selectedRaceForLevel, setSelectedRaceForLevel] = useState<RaceWithAgeGroups | null>(null);
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = useState(false);

  // Discipline filter state - default to Kajak and Kenu only
  const [selectedDisciplines, setSelectedDisciplines] = useState<Set<string>>(
    new Set(['Kajak', 'Kenu'])
  );

  // Hidden races filter state - default to show only visible races
  const [showHiddenRaces, setShowHiddenRaces] = useState(false);

  // Available disciplines
  const availableDisciplines = ['Kajak', 'Kenu', 'SUP', 'Kajakpóló', 'Parakenu', 'Sárkányhajó', 'Szlalom', 'Tengeri kajak'];

  useEffect(() => {
    loadRaces();
    loadLevels();
  }, [filteredRaces, raceSource]);

  const loadLevels = async () => {
    try {
      const levels = await window.electronAPI.getAllLevels();
      setAllLevels(levels);
    } catch (error) {
      console.error('Error loading levels:', error);
      setError('Hiba történt a futamszintek betöltése közben');
    }
  };

  // Debounce search term
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setSearching(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedDisciplines, showHiddenRaces, activeTab]);

  // Get race+level combinations for enhanced filtering
  const raceLevelCombinations = useMemo(() => {
    return getRaceLevelCombinations(scheduleRaces);
  }, [scheduleRaces]);

  // Get race-level status for each race
  const raceWithLevelStatus = useMemo(() => {
    return races.map(race => {
      const availableLevels = getAvailableLevelsForMode(race, scheduleRaces, allLevels, scheduleMode);
      const addedLevels = getAddedLevels(race, scheduleRaces);

      return {
        race,
        availableLevels,
        addedLevels,
        availableLevelsCount: availableLevels.length,
        addedLevelsCount: addedLevels.length,
        hasAvailableLevels: availableLevels.length > 0,
        hasAddedLevels: addedLevels.length > 0
      };
    });
  }, [races, scheduleRaces, allLevels, scheduleMode]);

  // Pre-compute searchable strings with level status for better performance
  const racesWithSearchTextAndLevels = useMemo(() => {
    return raceWithLevelStatus.map(raceStatus => ({
      ...raceStatus,
      searchText: [
        raceStatus.race.name,
        raceStatus.race.discipline,
        raceStatus.race.boatClass,
        raceStatus.race.gender,
        raceStatus.race.distance,
        ...raceStatus.race.ageGroups.map(ag => ag.name)
      ].join(' ').toLowerCase()
    }));
  }, [raceWithLevelStatus]);

  // Memoized filtered races for performance with enhanced tab logic
  const displayedRaces = useMemo(() => {
    let filtered = racesWithSearchTextAndLevels;

    // Enhanced tab filtering for cleaner navigation
    if (activeTab === 'added') {
      // Show races that have at least one level added
      filtered = filtered.filter(raceStatus => raceStatus.hasAddedLevels);
    } else if (activeTab === 'all') {
      // Show races that have NO levels added yet (cleaner navigation)
      filtered = filtered.filter(raceStatus => !raceStatus.hasAddedLevels);
    }

    // Filter by hidden status (unless showing hidden races)
    if (!showHiddenRaces) {
      filtered = filtered.filter(raceStatus => !raceStatus.race.hidden);
    }

    // Filter by selected disciplines
    filtered = filtered.filter(raceStatus => selectedDisciplines.has(raceStatus.race.discipline));

    // Filter by search term (using debounced term and pre-computed search text)
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(raceStatus => raceStatus.searchText.includes(searchLower));
    }

    return filtered;
  }, [debouncedSearchTerm, racesWithSearchTextAndLevels, selectedDisciplines, showHiddenRaces, activeTab]);

  // Paginated races for rendering
  const paginatedRaces = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return displayedRaces.slice(startIndex, endIndex);
  }, [displayedRaces, currentPage, pageSize]);

  // Pagination info
  const totalPages = Math.ceil(displayedRaces.length / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Calculate counts for tab titles with cleaner navigation logic
  const allRacesCount = useMemo(() => {
    // Count races with NO added levels (cleaner navigation)
    return raceWithLevelStatus.filter(raceStatus => !raceStatus.hasAddedLevels).length;
  }, [raceWithLevelStatus]);

  const addedRacesCount = useMemo(() => {
    // Count races with at least one added level
    return raceWithLevelStatus.filter(raceStatus => raceStatus.hasAddedLevels).length;
  }, [raceWithLevelStatus]);

  const loadRaces = useCallback(async () => {
    try {
      setLoading(true);

      if (raceSource === 'pdf-filtered' && filteredRaces) {
        // Use filtered races from PDF
        // Convert RaceWithCompetitorData to RaceWithAgeGroups format
        const convertedRaces: RaceWithAgeGroups[] = filteredRaces.map(race => ({
          id: race.id,
          name: race.name,
          discipline: race.discipline,
          boatClass: race.boatClass,
          gender: race.gender,
          distance: race.distance,
          occurrence: race.occurrence,
          hidden: race.hidden,
          createdAt: race.createdAt,
          updatedAt: race.updatedAt,
          ageGroups: race.ageGroups
        }));
        setRaces(convertedRaces);
      } else {
        // Load from database (traditional path)
        const raceData = await window.electronAPI.getAllRaces();
        setRaces(raceData);
      }

      setError(null);
    } catch (err) {
      setError('Hiba a versenyszámok betöltése közben');
      console.error('Failed to load races:', err);
    } finally {
      setLoading(false);
    }
  }, [raceSource, filteredRaces]);


  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleDisciplineToggle = useCallback((discipline: string, checked: boolean) => {
    setSelectedDisciplines(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(discipline);
      } else {
        newSet.delete(discipline);
      }
      return newSet;
    });
  }, []);

  // Memoized navigation handlers
  const handlePrevPage = useCallback(() => {
    setCurrentPage(page => Math.max(1, page - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(page => Math.min(totalPages, page + 1));
  }, [totalPages]);

  // Smart race click handler for level selection
  const handleRaceClick = useCallback((race: RaceWithAgeGroups) => {
    const availableLevels = getAvailableLevelsForMode(race, scheduleRaces, allLevels, scheduleMode);

    if (availableLevels.length === 0) {
      // All levels exhausted - no action
      return;
    } else if (availableLevels.length === 1 || scheduleMode === 'simplified') {
      // Auto-add with only available level (or in simplified mode, always auto-add)
      if (onRaceAdd && availableLevels.length > 0) {
        onRaceAdd(race, availableLevels[0]);
      }
    } else {
      // Show level selection modal (only in full mode with multiple levels)
      setSelectedRaceForLevel(race);
      setIsLevelSelectorOpen(true);
    }
  }, [scheduleRaces, allLevels, scheduleMode, onRaceAdd]);

  // Handle level selection from modal
  const handleLevelSelect = useCallback((race: RaceWithAgeGroups, level: Level) => {
    if (onRaceAdd) {
      onRaceAdd(race, level);
    }
  }, [onRaceAdd]);

  // Handle modal close
  const handleLevelSelectorClose = useCallback(() => {
    setIsLevelSelectorOpen(false);
    setSelectedRaceForLevel(null);
  }, []);

  const handleToggleRaceHidden = useCallback(async (race: RaceWithAgeGroups, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const newHiddenStatus = !race.hidden;
      const success = await window.electronAPI.updateRaceHidden(race.id, newHiddenStatus);

      if (success) {
        // Update the local state
        setRaces(prev => prev.map(r =>
          r.id === race.id ? { ...r, hidden: newHiddenStatus } : r
        ));
      } else {
        console.error('Failed to update race hidden status');
      }
    } catch (error) {
      console.error('Error updating race hidden status:', error);
    }
  }, []);

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Versenyszámok</h2>
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-red-700">{error}</div>
          <button
            onClick={loadRaces}
            className="mt-2 text-sm text-red-600 underline"
          >
            Újrapróbálkozás
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 flex flex-col h-full">
      <h2 className="text-base font-semibold mb-2">
        {raceSource === 'pdf-filtered' ? 'Nevezési lista' : 'Versenyszámok'}
      </h2>

      {/* PDF extraction info */}
      {raceSource === 'pdf-filtered' && pdfExtractionId && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-800">
            <div className="font-medium">PDF alapú versenyprogramozás</div>
            <div className="text-xs text-green-700 mt-1">
              Csak a nevezési listában szereplő versenyszámok
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">
            {raceSource === 'pdf-filtered' ? 'Nevezési lista' : 'Versenyszámok'} ({allRacesCount})
          </TabsTrigger>
          <TabsTrigger value="added">
            Felvett versenyszámok ({addedRacesCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
        )}
        <Input
          type="text"
          placeholder="Keresés..."
          value={searchTerm}
          onChange={handleSearchChange}
          className={`pl-10 ${searching ? 'pr-10' : ''}`}
        />
      </div>

      {/* Discipline Filters */}
      <LegacyCollapsible title="Szűrők" defaultOpen={true} className="mb-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {availableDisciplines.map((discipline) => (
            <div key={discipline} className="flex items-center space-x-2">
              <Checkbox
                id={`discipline-${discipline}`}
                checked={selectedDisciplines.has(discipline)}
                onCheckedChange={(checked) =>
                  handleDisciplineToggle(discipline, checked === true)
                }
              />
              <label
                htmlFor={`discipline-${discipline}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {discipline}
              </label>
            </div>
          ))}
        </div>

        {/* Show Hidden Races Toggle */}
        <div className="flex items-center space-x-2 pt-3 border-t border-border">
          <Checkbox
            id="show-hidden-races"
            checked={showHiddenRaces}
            onCheckedChange={(checked) => setShowHiddenRaces(checked === true)}
          />
          <label
            htmlFor="show-hidden-races"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
          >
            {showHiddenRaces ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Rejtett versenyszámok mutatása
          </label>
        </div>
      </LegacyCollapsible>

      {/* Count Display and Pagination Info */}
      <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
        <span>{displayedRaces.length} versenyszám ({paginatedRaces.length} megjelenítve)</span>
        {totalPages > 1 && (
          <span>Oldal {currentPage}/{totalPages}</span>
        )}
      </div>

      {/* Race List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-4">
          {loading ? (
            <TabbedPanelLoading
              message={raceSource === 'pdf-filtered' ? 'Nevezési lista betöltése...' : 'Versenyszámok betöltése...'}
            />
          ) : paginatedRaces.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {debouncedSearchTerm ? 'Nincs találat' : 'Nincsenek versenyszámok'}
            </div>
          ) : (
            paginatedRaces.map((raceStatus) => {
              // Find competitor data if this is from PDF filtering
              const competitorRace = filteredRaces?.find(fr => fr.id === raceStatus.race.id);

              return (
                <RaceCard
                  key={raceStatus.race.id}
                  race={raceStatus.race}
                  onRaceClick={handleRaceClick}
                  onToggleHidden={handleToggleRaceHidden}
                  showAddButton={
                    activeTab === 'all' ? true :  // Always show on "Versenyszámok" 
                      (activeTab === 'added' && raceStatus.hasAvailableLevels)  // Show on "Felvett" if more levels available
                  }
                  availableLevelsCount={raceStatus.availableLevelsCount}
                  addedLevelsCount={raceStatus.addedLevelsCount}
                  activeTab={activeTab}
                  scheduleMode={scheduleMode}
                  entryCount={competitorRace?.entryCount}
                  topCompetitors={competitorRace?.topCompetitors}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 px-2 py-1 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>

          <span className="text-xs text-muted-foreground px-1 min-w-[2rem] text-center">
            {currentPage}/{totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasNextPage}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Level Selector Modal */}
      <LevelSelectorModal
        race={selectedRaceForLevel}
        availableLevels={selectedRaceForLevel ? getAvailableLevelsForMode(selectedRaceForLevel, scheduleRaces, allLevels, scheduleMode) : []}
        isOpen={isLevelSelectorOpen}
        onClose={handleLevelSelectorClose}
        onLevelSelect={handleLevelSelect}
      />
    </div>
  );
});

RaceList.displayName = 'RaceList';

export default RaceList;