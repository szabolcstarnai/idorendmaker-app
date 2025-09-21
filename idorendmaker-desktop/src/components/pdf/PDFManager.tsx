import React, { useState, useCallback } from 'react';
import PDFExtractionList from './PDFExtractionList';
import PDFExtractionDetails from './PDFExtractionDetails';
import PDFUploadPanel from './PDFUploadPanel';
import TwoPanelLayout from '../layout/TwoPanelLayout';

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

interface PDFManagerProps {
  onNavigateToSchedule: (pdfExtractionId: number, filteredRaces: any[], competitorData: any) => void;
}

const PDFManager: React.FC<PDFManagerProps> = ({ onNavigateToSchedule }) => {
  const [selectedExtraction, setSelectedExtraction] = useState<PDFExtraction | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle extraction selection
  const handleExtractionSelect = useCallback((extraction: PDFExtraction) => {
    setSelectedExtraction(extraction);
  }, []);

  // Handle extraction deletion
  const handleExtractionDelete = useCallback(async (extraction: PDFExtraction) => {
    try {
      // Clear selection BEFORE deletion if it's the selected one
      const wasSelected = selectedExtraction?.id === extraction.id;
      if (wasSelected) {
        setSelectedExtraction(undefined);
      }

      const result = await window.electronAPI.pdfDeleteExtraction(extraction.id);
      if (!result.success) {
        // Restore selection if deletion failed
        if (wasSelected) {
          setSelectedExtraction(extraction);
        }
        throw new Error(result.error || 'Deletion failed');
      }

      console.log(`Successfully deleted PDF extraction: ${extraction.filename}`);
    } catch (error) {
      console.error('Failed to delete PDF extraction:', error);
      alert(`Hiba a törlés során: ${error instanceof Error ? error.message : 'Ismeretlen hiba'}`);
    }
  }, [selectedExtraction]);

  // Handle navigation to schedule builder with PDF data
  const handleCreateSchedule = useCallback(async (pdfExtractionId: number) => {
    try {
      // Load filtered races and competitor data
      const [filteredRaces, competitorData] = await Promise.all([
        window.electronAPI.pdfGetFilteredRaces(pdfExtractionId),
        window.electronAPI.pdfGetCompetitorData(pdfExtractionId)
      ]);

      onNavigateToSchedule(pdfExtractionId, filteredRaces, competitorData);
    } catch (error) {
      console.error('Error navigating to schedule:', error);
      alert('Hiba történt az időrend készítő megnyitásakor');
    }
  }, [onNavigateToSchedule]);

  // Handle upload completion - select the newly created extraction
  const handleUploadComplete = useCallback((pdfExtractionId: number) => {
    try {
      // Navigate directly to schedule builder with the new PDF data
      handleCreateSchedule(pdfExtractionId);
    } catch (error) {
      console.error('Error navigating after upload completion:', error);
      alert('Hiba történt a folytatáskor. Próbálja meg újra.');
    }
  }, [handleCreateSchedule]);

  // Force refresh of extraction list
  const handleRefreshExtractions = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Handle new PDF processing request
  const handleNewPDF = useCallback(() => {
    setSelectedExtraction(undefined);
  }, []);

  return (
    <TwoPanelLayout>
      <TwoPanelLayout.SidePanel title="PDF feldolgozások">
        <PDFExtractionList
          key={refreshKey} // Force re-render when refreshKey changes
          selectedExtraction={selectedExtraction}
          onSelect={handleExtractionSelect}
          onDelete={handleExtractionDelete}
          onNewPDF={handleNewPDF}
        />
      </TwoPanelLayout.SidePanel>

      <TwoPanelLayout.MainPanel>
        {selectedExtraction ? (
          <PDFExtractionDetails
            extraction={selectedExtraction}
            onCreateSchedule={handleCreateSchedule}
            onNewPDF={handleNewPDF}
          />
        ) : (
          <PDFUploadPanel
            onUploadComplete={handleUploadComplete}
            onRefreshExtractions={handleRefreshExtractions}
          />
        )}
      </TwoPanelLayout.MainPanel>
    </TwoPanelLayout>
  );
};

export default PDFManager;