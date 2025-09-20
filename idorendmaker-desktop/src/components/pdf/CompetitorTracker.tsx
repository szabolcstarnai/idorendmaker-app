import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { User, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { CompetitorSchedule, ScheduleRace } from '../../../shared/types/race';
import { LegacyCollapsible } from '../ui/collapsible';
import TruncatedText from '../common/TruncatedText';

interface CompetitorTrackerProps {
  scheduleRaces: ScheduleRace[];
  pdfExtractionId?: number;
  onHighlightRaces?: (raceIds: string[]) => void;
  layout?: 'sidebar' | 'full';
}

const CompetitorTracker: React.FC<CompetitorTrackerProps> = ({
  scheduleRaces,
  pdfExtractionId,
  onHighlightRaces,
  layout = 'full'
}) => {
  const [competitorSchedules, setCompetitorSchedules] = useState<CompetitorSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<Set<string>>(new Set(['high', 'medium', 'low']));

  // Load competitor schedule analysis
  const loadCompetitorAnalysis = useCallback(async () => {
    if (!pdfExtractionId || scheduleRaces.length === 0) {
      setCompetitorSchedules([]);
      return;
    }

    setLoading(true);
    try {
      const schedules = await window.electronAPI.competitorAnalyzeSchedules(scheduleRaces, pdfExtractionId);
      setCompetitorSchedules(schedules);
    } catch (error) {
      console.error('Error loading competitor analysis:', error);
      setCompetitorSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [scheduleRaces, pdfExtractionId]);

  useEffect(() => {
    loadCompetitorAnalysis();
  }, [loadCompetitorAnalysis]);

  // Filter competitors by selected risk levels
  const filteredCompetitors = competitorSchedules.filter(competitor =>
    selectedRiskLevels.has(competitor.riskLevel)
  );

  // Group competitors by risk level
  const competitorsByRisk = {
    high: competitorSchedules.filter(c => c.riskLevel === 'high'),
    medium: competitorSchedules.filter(c => c.riskLevel === 'medium'),
    low: competitorSchedules.filter(c => c.riskLevel === 'low')
  };

  // Toggle risk level filter
  const toggleRiskLevel = (level: string) => {
    const newLevels = new Set(selectedRiskLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedRiskLevels(newLevels);
  };

  // Highlight competitor races (from race pairs)
  const highlightCompetitorRaces = (competitor: CompetitorSchedule) => {
    if (onHighlightRaces) {
      const raceIds: string[] = [];

      competitor.racePairs.forEach(racePair => {
        // Find the exact schedule race ID for race1 (match both race and level)
        const race1ScheduleId = scheduleRaces.find(sr =>
          sr.race.id === racePair.race1Id && sr.level.id === racePair.level1Id
        )?.id;
        if (race1ScheduleId) {
          raceIds.push(race1ScheduleId);
        }

        // Find the exact schedule race ID for race2 (match both race and level)
        if (racePair.race2Id && racePair.level2Id) {
          const race2ScheduleId = scheduleRaces.find(sr =>
            sr.race.id === racePair.race2Id && sr.level.id === racePair.level2Id
          )?.id;
          if (race2ScheduleId) {
            raceIds.push(race2ScheduleId);
          }
        }
      });

      // Remove duplicates and highlight
      const uniqueRaceIds = [...new Set(raceIds)];
      onHighlightRaces(uniqueRaceIds);
    }
  };

  // Get risk level styling
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get conflict level icon
  const getConflictIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      default: return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
  };

  // Format time interval
  const formatInterval = (minutes?: number | null) => {
    if (minutes === undefined || minutes === null) return '-';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}ó ${mins}p`;
    }
    return `${minutes}p`;
  };

  if (!pdfExtractionId) {
    return (
      <LegacyCollapsible title="Versenyző követés" defaultOpen={false}>
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Csak nevezési lista alapú programozásban érhető el
          </CardContent>
        </Card>
      </LegacyCollapsible>
    );
  }

  const titleWithBadge = competitorSchedules.length > 0 
    ? `Versenyző követés (${filteredCompetitors.length})` 
    : "Versenyző követés";

  // Render content for both layouts
  const cardContent = (
    <>
      {/* Title header for sidebar layout */}
      {layout === 'sidebar' && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{titleWithBadge}</CardTitle>
        </CardHeader>
      )}

      {/* Risk level filters */}
      {competitorSchedules.length > 0 && (
        <CardHeader className={layout === 'sidebar' ? "pt-0 pb-2" : "pb-2"}>
          <div className="flex gap-1 flex-wrap">
            {['high', 'medium', 'low'].map(level => {
              const count = competitorsByRisk[level as keyof typeof competitorsByRisk].length;
              return (
                <Button
                  key={level}
                  variant={selectedRiskLevels.has(level) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleRiskLevel(level)}
                  className="h-5 px-1 text-xs"
                  disabled={count === 0}
                >
                  {level === 'high' ? 'Magas' : level === 'medium' ? 'Közepes' : 'Alacsony'} ({count})
                </Button>
              );
            })}
          </div>
        </CardHeader>
      )}

      <CardContent className={`${competitorSchedules.length > 0 ? "pt-0" : ""} ${layout === 'sidebar' ? 'flex-1 flex flex-col min-h-0 px-2 pb-2' : 'px-2 pb-2'}`}>
        {loading ? (
          <div className={`flex items-center justify-center text-sm text-muted-foreground ${layout === 'sidebar' ? 'flex-1' : 'h-32'}`}>
            Versenyző adatok elemzése...
          </div>
        ) : filteredCompetitors.length === 0 ? (
          <div className={`flex items-center justify-center text-sm text-muted-foreground ${layout === 'sidebar' ? 'flex-1' : 'h-32'}`}>
            {competitorSchedules.length === 0 ? 'Nincsenek versenyző adatok' : 'Nincs megfelelő versenyző'}
          </div>
        ) : (
          <ScrollArea className={layout === 'sidebar' ? "flex-1 h-0" : "h-64"}>
            <div className="space-y-2">
              {filteredCompetitors.map(competitor => (
                <Card
                  key={competitor.competitorId}
                  className="p-2 hover:shadow-sm cursor-pointer transition-shadow"
                  onClick={() => highlightCompetitorRaces(competitor)}
                >
                  <div className="space-y-1.5">
                    {/* Competitor header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{competitor.competitorName}</div>
                        <Badge
                          variant="outline"
                          className={`text-xs px-1 py-0 ${getRiskLevelColor(competitor.riskLevel)}`}
                        >
                          {competitor.riskLevel === 'high' ? 'Magas' :
                           competitor.riskLevel === 'medium' ? 'Közepes' : 'Alacsony'}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {competitor.racePairs.length} konfliktus
                      </Badge>
                    </div>

                    {/* Organization */}
                    {competitor.organization && (
                      <div className="text-xs text-muted-foreground">
                        {competitor.organization}
                      </div>
                    )}

                    {/* Race pair timeline - Color-Coded Cards */}
                    <div className="space-y-1.5">
                      {competitor.racePairs.map((racePair, index) =>
                        racePair.intervalToNext ? (
                          <div key={`${racePair.race1Id}-${racePair.race1StartTime}-${racePair.race2Id || 'single'}`}
                               className={`bg-gray-50 rounded p-1.5 border-l-3 ${
                                 racePair.conflictLevel === 'critical' ? 'border-red-400 bg-red-50' :
                                 racePair.conflictLevel === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                                 'border-green-400 bg-green-50'
                               }`}>
                            {/* First race in pair */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground font-medium">{racePair.race1StartTime}</span>
                                <TruncatedText className="text-xs font-medium">
                                  {racePair.race1Name}
                                </TruncatedText>
                              </div>
                            </div>

                            {/* Arrow separator */}
                            <div className="flex items-center justify-center py-0.5">
                              <span className="text-xs text-muted-foreground">↓</span>
                            </div>

                            {/* Second race in pair with gap info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground font-medium">{racePair.race2StartTime}</span>
                                <TruncatedText className="text-xs font-medium">
                                  {racePair.race2Name}
                                </TruncatedText>
                              </div>
                              <div className="flex items-center gap-1">
                                {getConflictIcon(racePair.conflictLevel)}
                                <span className={`text-xs font-medium ${
                                  racePair.conflictLevel === 'critical' ? 'text-red-600' :
                                  racePair.conflictLevel === 'warning' ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {formatInterval(racePair.intervalToNext)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>

                    {/* Summary stats */}
                    {(typeof competitor.shortestInterval === 'number' || typeof competitor.longestInterval === 'number') && (
                      <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                        <span>Legrövidebb: {formatInterval(competitor.shortestInterval)}</span>
                        <span>Leghosszabb: {formatInterval(competitor.longestInterval)}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </>
  );

  // Return appropriate layout based on layout prop
  if (layout === 'sidebar') {
    return (
      <Card className="h-full flex flex-col">
        {cardContent}
      </Card>
    );
  }

  // Default collapsible layout for backward compatibility
  return (
    <LegacyCollapsible
      title={titleWithBadge}
      defaultOpen={false}
    >
      <Card>
        {cardContent}
      </Card>
    </LegacyCollapsible>
  );
};

export default CompetitorTracker;