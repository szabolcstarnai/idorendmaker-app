import React from 'react';
import PDFManager from './PDFManager';

interface PDFProcessorProps {
  onNavigateToSchedule?: (pdfExtractionId: number, filteredRaces: any[], competitorData: any) => void;
}

const PDFProcessor: React.FC<PDFProcessorProps> = ({ onNavigateToSchedule }) => {
  return (
    <PDFManager
      onNavigateToSchedule={onNavigateToSchedule || (() => {})}
    />
  );
};

export default PDFProcessor;