import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  FileText, 
  Calendar, 
  Database, 
  Clock, 
  Users, 
  Trophy, 
  Hash, 
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Upload
} from 'lucide-react';
import TruncatedText from '../common/TruncatedText';

// PDF Extraction interface matching our API
interface PDFExtraction {
  id: number;
  filename: string;
  fileHash: string | null;
  totalRaces: number;
  totalCompetitors: number;
  totalEntries: number;
  extractionStatus: string;
  status: string;
  linkedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  linkedSchedules: string[];
  competitorEntriesCount: number;
  raceAssociationsCount: number;
  schedulesUsingCount: number;
  canDelete: boolean;
}

interface PDFExtractionDetailsProps {
  extraction: PDFExtraction;
  onCreateSchedule: (pdfExtractionId: number) => void;
  onNewPDF?: () => void;
}

const PDFExtractionDetails: React.FC<PDFExtractionDetailsProps> = ({ 
  extraction, 
  onCreateSchedule,
  onNewPDF
}) => {
  const [detailedStats, setDetailedStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [filteredRaces, setFilteredRaces] = useState<any[]>([]);
  const [loadingRaces, setLoadingRaces] = useState(false);
  const [racesError, setRacesError] = useState<string | null>(null);

  // Load detailed stats for the extraction
  const loadDetailedStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      setStatsError(null);
      const stats = await window.electronAPI.pdfGetExtractionStats(extraction.id);
      setDetailedStats(stats);
    } catch (error) {
      console.error('Failed to load extraction stats:', error);
      setStatsError(error instanceof Error ? error.message : 'Hiba a statisztikák betöltésekor');
      setDetailedStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [extraction.id]);

  // Load filtered races preview
  const loadFilteredRaces = useCallback(async () => {
    try {
      setLoadingRaces(true);
      setRacesError(null);
      const races = await window.electronAPI.pdfGetFilteredRaces(extraction.id);
      setFilteredRaces(races.slice(0, 5)); // Preview first 5 races
    } catch (error) {
      console.error('Failed to load filtered races:', error);
      setRacesError(error instanceof Error ? error.message : 'Hiba a versenyszámok betöltésekor');
      setFilteredRaces([]);
    } finally {
      setLoadingRaces(false);
    }
  }, [extraction.id]);

  // Load data on mount and when extraction changes
  useEffect(() => {
    loadDetailedStats();
    loadFilteredRaces();
  }, [loadDetailedStats, loadFilteredRaces]);

  const handleCreateSchedule = useCallback(() => {
    onCreateSchedule(extraction.id);
  }, [extraction.id, onCreateSchedule]);

  const formatDate = useCallback((date: Date | string) => {
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }, []);

  const formatDateShort = useCallback((date: Date | string) => {
    return new Intl.DateTimeFormat('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }, []);

  const getStatusInfo = useMemo(() => {
    switch (extraction.status) {
      case 'session':
        return {
          badge: (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              <Clock className="h-3 w-3 mr-1" />
              Munkamenet
            </Badge>
          ),
          description: 'Ideiglenesen tárolt adatok a munkamenet során',
          warning: extraction.expiresAt ? `Lejárat: ${formatDateShort(extraction.expiresAt)}` : null
        };
      case 'linked':
        return {
          badge: (
            <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200">
              <Database className="h-3 w-3 mr-1" />
              Kapcsolt
            </Badge>
          ),
          description: 'Időrendhez kapcsolt, tartósan tárolt adatok',
          warning: null
        };
      case 'archived':
        return {
          badge: <Badge variant="secondary">Archivált</Badge>,
          description: 'Archivált adatok',
          warning: null
        };
      default:
        return {
          badge: <Badge variant="outline">{extraction.status}</Badge>,
          description: 'Ismeretlen állapot',
          warning: null
        };
    }
  }, [extraction.status, extraction.expiresAt, formatDateShort]);

  const isExpiring = useMemo(() => {
    if (!extraction.expiresAt || extraction.status !== 'session') return false;
    const expiryTime = new Date(extraction.expiresAt).getTime();
    const now = Date.now();
    const hourFromNow = now + (60 * 60 * 1000);
    return expiryTime < hourFromNow;
  }, [extraction.expiresAt, extraction.status]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="max-w-3xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <TruncatedText as="h1" className="text-lg font-semibold">{extraction.filename}</TruncatedText>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusInfo.badge}
                  {isExpiring && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Hamarosan lejár
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onNewPDF && (
                <Button 
                  variant="outline" 
                  onClick={onNewPDF} 
                  className="gap-2"
                  size="sm"
                >
                  <Upload className="h-4 w-4" />
                  Új PDF
                </Button>
              )}
              <Button onClick={handleCreateSchedule} className="gap-2">
                <Calendar className="h-4 w-4" />
                Időrend készítése
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">{getStatusInfo.description}</p>
          {getStatusInfo.warning && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">{getStatusInfo.warning}</span>
            </div>
          )}
        </div>

        {/* Statistics Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Statisztikák</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Versenyszámok</span>
                </div>
                <div className="text-2xl font-bold">{extraction.totalRaces}</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Versenyzők</span>
                </div>
                <div className="text-2xl font-bold">{extraction.totalCompetitors}</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Nevezések</span>
                </div>
                <div className="text-2xl font-bold">{extraction.totalEntries}</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Időrendek</span>
                </div>
                <div className="text-2xl font-bold">{extraction.schedulesUsingCount}</div>
              </div>
            </div>
            
            {/* Additional Statistics Row */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadingStats ? (
                  <div className="col-span-2 flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">További statisztikák betöltése...</span>
                  </div>
                ) : statsError ? (
                  <div className="col-span-2 flex items-center text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>{statsError}</span>
                  </div>
                ) : detailedStats && (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Párosított futamok</span>
                      </div>
                      <div className="text-lg font-bold">
                        {detailedStats.matchedRaces} / {extraction.totalRaces}
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({Math.round((detailedStats.matchedRaces / extraction.totalRaces) * 100)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Átlagos nevezés/futam</span>
                      </div>
                      <div className="text-lg font-bold">
                        {extraction.totalRaces > 0 
                          ? (extraction.totalEntries / extraction.totalRaces).toFixed(1)
                          : '0'
                        }
                        <span className="text-sm font-normal text-muted-foreground ml-2">nevezés</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Metaadatok</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Feldolgozva:</span>
                  <span className="font-medium">{formatDate(extraction.createdAt)}</span>
                </div>
                
                {extraction.linkedAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Kapcsolva:</span>
                    <span className="font-medium">{formatDate(extraction.linkedAt)}</span>
                  </div>
                )}
                
                {extraction.fileHash && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fájl hash:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {extraction.fileHash.substring(0, 16)}...
                    </code>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Adatok állapota:</span>
                  <span className="font-medium">
                    {extraction.status === 'session' && 'Munkamenet (ideiglenesen tárolt)'}
                    {extraction.status === 'linked' && 'Kapcsolt (tartósan tárolt)'}
                    {extraction.status === 'archived' && 'Archivált'}
                  </span>
                </div>
                
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Schedules */}
        {extraction.linkedSchedules.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kapcsolódó időrendek</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {extraction.linkedSchedules.map((scheduleName, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{scheduleName}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Race Preview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Párosított versenyszámok előnézete</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={loadFilteredRaces}
                disabled={loadingRaces}
                className="h-8 px-2"
              >
                {loadingRaces ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingRaces ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Versenyszámok betöltése...</span>
              </div>
            ) : racesError ? (
              <div className="flex items-center justify-center py-4 text-red-600">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm">{racesError}</span>
              </div>
            ) : filteredRaces.length > 0 ? (
              <div className="space-y-2">
                {filteredRaces.map((race, index) => (
                  <div key={index} className="p-2 border rounded-md">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{race.name}</span>
                      <Badge 
                        variant={race.id ? "default" : "outline"}
                        className="text-xs"
                      >
                        {race.id ? "Párosítva" : "Nincs pár"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {race.entryCount || race.competitors?.length || 0} nevezés
                    </div>
                  </div>
                ))}
                {extraction.totalRaces > 5 && (
                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      ...és még {extraction.totalRaces - 5} versenyszám
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <span className="text-sm text-muted-foreground">Nincsenek párosított versenyszámok</span>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PDFExtractionDetails;