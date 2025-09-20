import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Upload, 
  FileText, 
  Check, 
  AlertCircle, 
  Loader2, 
  Calendar,
  Server,
  Trash2,
  CircleX
} from 'lucide-react';
import { toast } from 'sonner';

interface PDFProcessorResult {
  totalCompetitors: number;
  totalEntries: number;
  success: boolean;
  error?: string;
  wasDeduplication?: boolean;
  pdfExtractionId?: number;
  extractedRaces?: Array<{
    name: string;
    matchedDatabaseRaceId?: number;
    competitors: Array<{ name: string }>;
  }>;
}

interface PDFUploadPanelProps {
  onUploadComplete: (pdfExtractionId: number) => void;
  onRefreshExtractions?: () => void;
}

const PDFUploadPanel: React.FC<PDFUploadPanelProps> = ({ 
  onUploadComplete, 
  onRefreshExtractions 
}) => {
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processorStatus, setProcessorStatus] = useState<{
    isReady?: boolean;
    isRunning?: boolean;
    port?: number;
  } | null>(null);
  const [result, setResult] = useState<PDFProcessorResult | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [pdfExtractionId, setPdfExtractionId] = useState<number | null>(null);
  const [racesToProcess, setRacesToProcess] = useState<number | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Load processor status
  const loadProcessorStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const status = await window.electronAPI.pdfGetStatus();
      setProcessorStatus(status);
    } catch (error) {
      console.error('Failed to load processor status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Start PDF processor on mount
  React.useEffect(() => {
    let isMounted = true;
    const startProcessor = async () => {
      setIsLoadingStatus(true);
      try {
        const result = await window.electronAPI.pdfStart();
        if (result.success && isMounted) {
          await loadProcessorStatus();
        }
      } catch (error) {
        console.error('Processor start error:', error);
      } finally {
        if (isMounted) setIsLoadingStatus(false);
      }
    };
    startProcessor();
    return () => {
      isMounted = false;
      window.electronAPI.pdfStop();
    };
  }, [loadProcessorStatus]);

  // Select PDF file
  const handleSelectFile = async () => {
    try {
      const result = await window.electronAPI.pdfSelectFile();
      if (result.success) {
        setSelectedFile({ path: result.filePath, name: result.fileName });
        setResult(null); // Clear previous results
        setPdfExtractionId(null);
      } else if (result.error !== 'Fájl kiválasztás megszakítva') {
        alert(`Hiba: ${result.error}`);
      }
    } catch (error) {
      console.error('File selection error:', error);
      alert('Hiba a fájl kiválasztásnál');
    }
  };

  // Process PDF file with race matching and competitor tracking
  const handleProcessPDF = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);
    setPdfExtractionId(null);
    setRacesToProcess(null);

    try {
      // First extract PDF data to get race count
      const pdfResult = await window.electronAPI.pdfProcess(selectedFile.path);
      
      if (pdfResult.success && pdfResult.data) {
        // Show race count during backend matching
        setRacesToProcess(pdfResult.data.length);
        
        // Now process and match the races
        const result = await window.electronAPI.pdfProcessAndMatch(selectedFile.path);
        setResult(result);
        
        if (result.success && result.pdfExtractionId) {
          setPdfExtractionId(result.pdfExtractionId);
          
          // Refresh the extraction list if callback provided
          onRefreshExtractions?.();
        }
      } else {
        setResult({
          success: false,
          error: pdfResult.error || 'PDF feldolgozási hiba',
          extractedRaces: [],
          totalCompetitors: 0,
          totalEntries: 0
        });
      }
    } catch (error) {
      console.error('PDF processing error:', error);
      setResult({
        success: false,
        error: 'Hiba történt a feldolgozás során',
        extractedRaces: [],
        totalCompetitors: 0,
        totalEntries: 0
      });
    } finally {
      setIsProcessing(false);
      setRacesToProcess(null);
    }
  };

  // Navigate to schedule builder with PDF data
  const handleNavigateToSchedule = useCallback(() => {
    if (!pdfExtractionId) return;
    onUploadComplete(pdfExtractionId);
  }, [pdfExtractionId, onUploadComplete]);

  // Clean up expired sessions
  const handleCleanupExpiredSessions = async () => {
    setIsCleaningUp(true);
    try {
      const result = await window.electronAPI.pdfCleanupExpiredSessions();
      onRefreshExtractions?.();
      if (result.deletedExtractions === 0 || result.deletedRecords === 0) {
        toast.info('Nincs törlendő adat');
      } else {
        toast.success(`Törölve: ${result.deletedExtractions} feldolgozás, ${result.deletedRecords} rekord`);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Hiba a takarítás során');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Clear current file selection
  const handleClearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setPdfExtractionId(null);
    setRacesToProcess(null);
  };

  // Load status on component mount
  React.useEffect(() => {
    loadProcessorStatus();
  }, [loadProcessorStatus]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="h-full">
        <div className="p-4">
          <div className="max-w-3xl mx-auto space-y-4">
        
        {/* Service Status */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Feldolgozó szolgáltatás</span>
              </div>
              <div className="flex items-center gap-4">
                {isLoadingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div 
                        className={`h-2 w-2 rounded-full ${
                          processorStatus?.isReady ? 'bg-green-500' : 
                          processorStatus?.isRunning ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-sm font-medium">
                        {processorStatus?.isReady ? 'Készen áll' : 
                         processorStatus?.isRunning ? 'Indítás...' : 'Leállítva'}
                      </span>
                    </div>
                    {processorStatus?.port && (
                      <span className="text-xs text-muted-foreground">:{processorStatus.port}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cleanup Tools */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Adatbázis karbantartás</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Lejárt munkamenet adatok automatikus törlése
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanupExpiredSessions}
                disabled={isCleaningUp}
                className="gap-2"
              >
                {isCleaningUp ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Takarítás
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Selection and Processing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Új PDF nevezési lista feldolgozása
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {selectedFile ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFile}
                      className="h-6 w-6 p-0 ml-2"
                    >
                      <CircleX className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nincs fájl kiválasztva</p>
                )}
              </div>
              <Button 
                onClick={handleSelectFile}
                variant="outline"
                className="gap-2"
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4" />
                Fájl kiválasztása
              </Button>
            </div>
            
            {/* Process Button */}
            <div className="pt-2 border-t">
              <Button 
                onClick={handleProcessPDF}
                disabled={!selectedFile || !processorStatus?.isReady || isProcessing}
                className="w-full gap-2"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    PDF nevezési lista feldolgozása...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    PDF nevezési lista feldolgozása
                  </>
                )}
              </Button>
              
              {!processorStatus?.isReady && selectedFile && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  A feldolgozáshoz először indítsd el a szolgáltatást
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Simple Loading with Race Count */}
        {racesToProcess && isProcessing && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="text-sm text-muted-foreground">
                  {racesToProcess} versenyszám feldolgozása...
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {result.success ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Sikeres feldolgozás
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Feldolgozási hiba
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {result.success ? (
                <div className="space-y-4">
                  {/* Deduplication indicator */}
                  {result.wasDeduplication && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800">
                          Ismételt feldolgozás
                        </Badge>
                        <span className="text-sm text-yellow-700">
                          Ez a PDF már korábban feldolgozásra került. 
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Badge className="bg-green-100 text-green-800 text-center">
                      {result.extractedRaces?.length || 0} versenyszám
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800 text-center">
                      {result.totalCompetitors || 0} versenyző
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800 text-center">
                      {result.totalEntries || 0} nevezés
                    </Badge>
                  </div>

                  {/* Navigation to Schedule Builder */}
                  {pdfExtractionId && (
                    <div className="flex flex-col gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800 font-medium">
                        ✅ Adatok feldolgozva és összepárosítva
                      </div>
                      <div className="text-xs text-blue-700">
                        Folytathatja az időrend készítést a kinyert adatokkal
                      </div>
                      <Button 
                        onClick={handleNavigateToSchedule}
                        className="w-full mt-2"
                        size="sm"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Időrend készítése
                      </Button>
                    </div>
                  )}
                  
                  {result.extractedRaces && result.extractedRaces.length > 0 && (
                    <ScrollArea className="h-48 w-full border rounded">
                      <div className="p-4 space-y-2">
                        {result.extractedRaces.map((race: { name: string; matchedDatabaseRaceId?: number; competitors: Array<{ name: string }> }, index: number) => (
                          <div key={index} className="p-3 border rounded bg-card">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-sm">{race.name}</div>
                              <Badge 
                                variant={race.matchedDatabaseRaceId ? "default" : "outline"}
                                className="text-xs"
                              >
                                {race.matchedDatabaseRaceId ? "Párosítva" : "Nincs pár"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {race.competitors.length} nevezés
                              {race.competitors.length > 0 && (
                                <span className="ml-2">
                                  ({race.competitors.slice(0, 3).map((c: { name: string }) => c.name).join(', ')}
                                  {race.competitors.length > 3 && ' +' + (race.competitors.length - 3) + ' más'})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              ) : (
                <div className="text-red-600">
                  <p>{result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PDFUploadPanel;