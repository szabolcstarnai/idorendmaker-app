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
    high: filteredCompetitors.filter(c => c.riskLevel === 'high'),
    medium: filteredCompetitors.filter(c => c.riskLevel === 'medium'),
    low: filteredCompetitors.filter(c => c.riskLevel === 'low')
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

  // Highlight competitor races
  const highlightCompetitorRaces = (competitor: CompetitorSchedule) => {
    if (onHighlightRaces) {
      const raceIds = competitor.races.map(race => 
        // Find the corresponding schedule race ID
        scheduleRaces.find(sr => sr.race.id === race.raceId)?.id
      ).filter(id => id !== undefined) as string[];
      
      onHighlightRaces(raceIds);
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
  const formatInterval = (minutes?: number) => {
    if (minutes === undefined) return '-';
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

      <CardContent className={`${competitorSchedules.length > 0 ? "pt-0" : ""} ${layout === 'sidebar' ? 'flex-1 flex flex-col min-h-0' : ''}`}>
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
                  <div className="space-y-2">
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
                        {competitor.totalRaces} futam
                      </Badge>
                    </div>

                    {/* Organization */}
                    {competitor.organization && (
                      <div className="text-xs text-muted-foreground">
                        {competitor.organization}
                      </div>
                    )}

                    {/* Race timeline */}
                    <div className="space-y-1">
                      {competitor.races.map((race, index) => (
                        <div key={`${race.raceId}-${race.scheduledTime}`} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            {getConflictIcon(race.conflictLevel)}
                            <span className="text-muted-foreground">{race.scheduledTime}</span>
                            <TruncatedText className={layout === 'sidebar' ? "max-w-24" : "max-w-32"}>
                              {race.raceName}
                            </TruncatedText>
                          </div>
                          {race.intervalToNext !== undefined && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className={`text-xs ${
                                race.conflictLevel === 'critical' ? 'text-red-600 font-medium' :
                                race.conflictLevel === 'warning' ? 'text-yellow-600' :
                                'text-muted-foreground'
                              }`}>
                                {formatInterval(race.intervalToNext)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Summary stats */}
                    {(competitor.shortestInterval !== null || competitor.longestInterval !== null) && (
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