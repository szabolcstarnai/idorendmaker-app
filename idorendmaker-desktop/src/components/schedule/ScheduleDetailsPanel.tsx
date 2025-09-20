import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Calendar,
  Clock,
  FileText,
  Download,
  Trash2,
  Edit3,
  Play,
  Database,
  BarChart3,
  Loader2
} from 'lucide-react';
import StandardEmptyState from '../common/StandardEmptyState';
import { ConfirmationDialog } from '../dialogs';
import { ScheduleWithPDFStatus } from './CompactScheduleCard';
import { ScheduleStatistics } from '../../data/services/BackendAPIService';
import { toast } from 'sonner';

interface ScheduleDetailsPanelProps {
  selectedSchedule?: ScheduleWithPDFStatus;
  onScheduleSelected: (schedule: ScheduleWithPDFStatus) => void;
  onCreateNewSchedule?: () => void;
  onScheduleDeleted: () => void; // Callback to refresh the list
  onScheduleRenamed: () => void; // Callback to refresh the list after rename
  onScheduleUpdated: (updatedSchedule: ScheduleWithPDFStatus) => void; // Callback to update selected schedule object
}

/**
 * ScheduleDetailsPanel
 *
 * Right panel component showing selected schedule details and management actions.
 * Follows the same patterns as other main panels in the app.
 */
const ScheduleDetailsPanel: React.FC<ScheduleDetailsPanelProps> = ({
  selectedSchedule,
  onScheduleSelected,
  onCreateNewSchedule,
  onScheduleDeleted,
  onScheduleRenamed,
  onScheduleUpdated
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [statistics, setStatistics] = useState<ScheduleStatistics | null>(null);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);

  // Load statistics when schedule is selected
  useEffect(() => {
    const loadStatistics = async () => {
      if (!selectedSchedule) {
        setStatistics(null);
        return;
      }

      setIsLoadingStatistics(true);
      try {
        const stats = await window.electronAPI.getScheduleStatistics(selectedSchedule.id);
        setStatistics(stats);
      } catch (error) {
        console.error('Error loading schedule statistics:', error);
        setStatistics(null);
      } finally {
        setIsLoadingStatistics(false);
      }
    };

    loadStatistics();
  }, [selectedSchedule?.id]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

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

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} perc`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} óra`;
    }
    return `${hours}ó ${remainingMinutes}p`;
  };

  const handleLoadSchedule = () => {
    if (selectedSchedule) {
      onScheduleSelected(selectedSchedule);
    }
  };

  const handleExport = async () => {
    if (!selectedSchedule) return;

    setIsExporting(true);
    try {
      const result = await window.electronAPI.exportScheduleToExcel(
        selectedSchedule.id,
        selectedSchedule.name
      );

      if (result.success) {
        console.log('Schedule exported successfully:', result.fullPath);
        // Optional: Show success toast/notification
        toast.success(`Excel exportálás sikeres: ${result.filename}`)
      } else {
        console.error('Export failed:', result.error);
        toast.error(`Hiba az exportálás során: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Hiba történt az exportálás során.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSchedule) return;

    setIsDeleting(true);
    try {
      await window.electronAPI.deleteSchedule(selectedSchedule.id);
      setShowDeleteConfirm(false);
      onScheduleDeleted(); // Refresh the list
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Hiba történt a törlés során.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleRenameStart = () => {
    if (selectedSchedule) {
      setNewName(selectedSchedule.name);
      setIsRenaming(true);
    }
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setNewName('');
  };

  const handleRenameSave = async () => {
    if (!selectedSchedule || !newName.trim()) return;

    try {
      await window.electronAPI.renameSchedule(selectedSchedule.id, newName.trim());

      // Create updated schedule object with new name and timestamp
      const updatedSchedule: ScheduleWithPDFStatus = {
        ...selectedSchedule,
        name: newName.trim(),
        updatedAt: new Date() // Update the modified timestamp
      };

      setIsRenaming(false);
      setNewName('');

      // Update the selected schedule object immediately (shows new name in details panel)
      onScheduleUpdated(updatedSchedule);

      // Optional: Show success feedback
      console.log('Schedule renamed successfully');
    } catch (error) {
      console.error('Error renaming schedule:', error);
      alert('Hiba történt az átnevezés során.');
    }
  };

  // Show empty state when no schedule is selected
  if (!selectedSchedule) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <StandardEmptyState
          type="action-prompt"
          title="Válassz egy időrendet a részletekhez"
          description="Kattints egy időrendre a bal oldali listában a részletek megtekintéséhez és a kezelési lehetőségek eléréséhez."
          actionLabel="Új időrend készítése"
          onAction={onCreateNewSchedule}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with title and primary actions */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                {isRenaming ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="text-xl font-semibold bg-transparent border border-primary rounded px-2 py-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSave();
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                    />
                    <Button size="sm" onClick={handleRenameSave} disabled={!newName.trim()}>
                      Mentés
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleRenameCancel}>
                      Mégse
                    </Button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-semibold text-foreground">
                      {selectedSchedule.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedSchedule.hasPDFData && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          <Database className="h-3 w-3 mr-1" />
                          PDF adatok
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Primary Action */}
            {!isRenaming && (
              <Button onClick={handleLoadSchedule} size="lg">
                <Play className="h-4 w-4 mr-2" />
                Betöltés
              </Button>
            )}
          </div>
        </div>

        {/* Schedule Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Időrend információk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Létrehozva:</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {formatDate(selectedSchedule.createdAt)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Módosítva:</span>
                </div>
                <p className="text-sm text-muted-foreground ml-6">
                  {formatDate(selectedSchedule.updatedAt)}
                </p>
              </div>
            </div>

            {selectedSchedule.hasPDFData && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Nevezési adatok adatok elérhetők</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Ez az időrend versenyzőadatokkal rendelkezik PDF feldolgozásból
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statisztikák
            </CardTitle>
            {isLoadingStatistics && (
              <CardDescription>
                Statisztikák betöltése...
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingStatistics ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : statistics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{statistics.totalSections}</div>
                    <div className="text-xs text-muted-foreground">Szakasz</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{statistics.totalRaces}</div>
                    <div className="text-xs text-muted-foreground">Versenyszám</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {formatDuration(statistics.totalDurationMinutes)}
                    </div>
                    <div className="text-xs text-muted-foreground">Időtartam</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-foreground">{statistics.uniqueRaceTypes}</div>
                    <div className="text-xs text-muted-foreground">Egyedi versenyszám típus</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-lg font-bold text-foreground">{statistics.mostCommonInterval} perc</div>
                    <div className="text-xs text-muted-foreground">Leggyakoribb szünet</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nem sikerült betölteni a statisztikákat
              </div>
            )}
          </CardContent>
        </Card>

        {/* Management Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kezelési lehetőségek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleRenameStart}
                disabled={isRenaming}
                className="justify-start"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Átnevezés
              </Button>

              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="justify-start"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Excel export
              </Button>

              <Button
                variant="destructive"
                onClick={handleDeleteRequest}
                disabled={isDeleting}
                className="justify-start col-span-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Törlés
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog for Schedule Deletion */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Időrend törlése"
        description={`Biztosan törölni szeretnéd a "${selectedSchedule.name}" időrendet? Ez a művelet nem vonható vissza.`}
        confirmLabel="Törlés"
        cancelLabel="Mégse"
        variant="destructive"
      />
    </div>
  );
};

export default ScheduleDetailsPanel;