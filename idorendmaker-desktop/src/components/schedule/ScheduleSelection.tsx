import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Calendar, Clock, FileText, Search, Database, Trash2, Download, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FullContentLoading } from '../ui/loading';
import { Schedule } from '../../../shared/types/race';
import { ConfirmationDialog } from '../dialogs';

// Extended schedule type with PDF status
interface ScheduleWithPDFStatus extends Schedule {
  hasPDFData?: boolean
}

interface ScheduleSelectionProps {
  onScheduleSelected: (schedule: Schedule) => void;
}

const ScheduleSelection: React.FC<ScheduleSelectionProps> = ({ onScheduleSelected }) => {
  const [schedules, setSchedules] = useState<ScheduleWithPDFStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleWithPDFStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingScheduleId, setExportingScheduleId] = useState<number | null>(null);

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      
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
      setLoading(false);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setLoading(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    // Handle both Date objects (from Prisma) and ISO date strings (from REST API)
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const handleScheduleClick = (schedule: Schedule) => {
    // Load the selected schedule - the actual loading logic is implemented in App.tsx
    console.log('Loading schedule:', schedule.name);
    onScheduleSelected(schedule);
  };

  const handleExportToExcel = async (schedule: ScheduleWithPDFStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingScheduleId(schedule.id);
    
    try {
      // Use the same export logic as ScheduleBuilder
      const result = await window.electronAPI.exportScheduleToExcel(schedule.id, schedule.name);
      
      if (result.success) {
        console.log('Schedule exported successfully:', result.fullPath);
        // Optional: Show success toast/notification
      } else {
        console.error('Export failed:', result.error);
        alert(`Hiba az exportálás során: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Hiba történt az exportálás során.');
    } finally {
      setExportingScheduleId(null);
    }
  };

  const handleRequestDelete = (schedule: ScheduleWithPDFStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setScheduleToDelete(schedule);
  };

  const handleConfirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    setIsDeleting(true);
    try {
      await window.electronAPI.deleteSchedule(scheduleToDelete.id);
      await loadSchedules(); // Reload the list
      setScheduleToDelete(null);
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Hiba történt a törlés során.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setScheduleToDelete(null);
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search */}
        <div className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Keresés az időrendek között..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-8"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
           <FullContentLoading message="Időrendek betöltése..." />
        )}

        {/* Schedule List */}
        {!loading && (
          <>
            {filteredSchedules.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent className="p-6">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <CardTitle className="text-base text-foreground mb-2">
                    {searchTerm ? 'Nincs találat' : 'Még nincs mentett időrend'}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {searchTerm 
                      ? 'Próbáljon más keresési kifejezést használni.'
                      : 'Kezdjen egy új időrend készítésével a főmenüből.'
                    }
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.map((schedule) => (
                  <Card
                    key={schedule.id}
                    className="hover:shadow-md transition-all cursor-pointer border hover:border-primary/50 group"
                    onClick={() => handleScheduleClick(schedule)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-foreground">
                                {schedule.name}
                              </h3>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  Időrend
                                </Badge>
                                {schedule.hasPDFData && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                                    <Database className="h-3 w-3 mr-1" />
                                    PDF adatok
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1 ml-11">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>Létrehozva: {formatDate(schedule.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Módosítva: {formatDate(schedule.updatedAt)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {schedule.hasPDFData ? (
                                <span className="text-blue-600 font-medium">📊 Versenyzőadatok elérhetők</span>
                              ) : (
                                <span>Hagyományos üzemmód</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {/* Export Button - appears on hover */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleExportToExcel(schedule, e)}
                            disabled={exportingScheduleId === schedule.id}
                            title="Exportálás Excelbe"
                          >
                            {exportingScheduleId === schedule.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                          
                          {/* Delete Button - appears on hover */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                            onClick={(e) => handleRequestDelete(schedule, e)}
                            title="Törlés"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          
                          {/* Load Button - always visible */}
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleClick(schedule);
                            }}
                          >
                            Betöltés
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Confirmation Dialog for Schedule Deletion */}
      <ConfirmationDialog
        isOpen={scheduleToDelete !== null}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Időrend törlése"
        description={scheduleToDelete ? `Biztosan törölni szeretnéd a "${scheduleToDelete.name}" időrendet? Ez a művelet nem vonható vissza.` : ''}
        confirmLabel="Törlés"
        cancelLabel="Mégse"
        variant="destructive"
      />
    </div>
  );
};

export default ScheduleSelection;