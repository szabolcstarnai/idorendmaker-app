import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Loader2, FileText, Database, Clock, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import ProfessionalSearch from '../common/ProfessionalSearch';
import StandardEmptyState from '../common/StandardEmptyState';
import CompactPagination from '../common/CompactPagination';
import TruncatedText from '../common/TruncatedText';
import { ConfirmationDialog } from '../dialogs';

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

interface PDFExtractionListProps {
  selectedExtraction?: PDFExtraction;
  onSelect: (extraction: PDFExtraction) => void;
  onDelete: (extraction: PDFExtraction) => Promise<void>;
}

// Ultra-compact PDF extraction card component
const CompactExtractionCard = React.memo(({ 
  extraction, 
  isSelected,
  onSelect, 
  onRequestDelete
}: {
  extraction: PDFExtraction;
  isSelected: boolean;
  onSelect: (extraction: PDFExtraction) => void;
  onRequestDelete: (extraction: PDFExtraction) => void;
}) => {
  const handleRequestDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(extraction);
  }, [extraction, onRequestDelete]);

  const getStatusBadge = useCallback(() => {
    switch (extraction.status) {
      case 'session':
        return (
          <Badge variant="outline" className="text-xs px-1 py-0 bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Munkamenet
          </Badge>
        );
      case 'linked':
        return (
          <Badge variant="default" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
            <Database className="h-3 w-3 mr-1" />
            Kapcsolt
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="secondary" className="text-xs px-1 py-0">
            Archivált
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs px-1 py-0">
            {extraction.status}
          </Badge>
        );
    }
  }, [extraction.status]);

  const isExpiring = useMemo(() => {
    if (!extraction.expiresAt || extraction.status !== 'session') return false;
    const expiryTime = new Date(extraction.expiresAt).getTime();
    const now = Date.now();
    const hourFromNow = now + (60 * 60 * 1000);
    return expiryTime < hourFromNow;
  }, [extraction.expiresAt, extraction.status]);

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, []);

  return (
    <Card
      className={`transition-all hover:shadow-md group relative cursor-pointer ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onClick={() => onSelect(extraction)}
    >
      <CardContent className="p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
              <FileText className="h-3 w-3 text-blue-600" />
            </div>
            <TruncatedText className="text-sm font-medium min-w-0 flex-1">{extraction.filename}</TruncatedText>
            {isExpiring && (
              <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {extraction.canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestDelete}
                className="h-6 w-6 p-0 hover:text-destructive"
                title="Törlés"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {getStatusBadge()}
          {extraction.schedulesUsingCount > 0 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              <ExternalLink className="h-2 w-2 mr-1" />
              {extraction.schedulesUsingCount} időrend
            </Badge>
          )}
        </div>
        
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between items-center min-w-0">
            <TruncatedText>{`${extraction.totalRaces} versenyszám`}</TruncatedText>
            <TruncatedText>{`${extraction.totalCompetitors} versenyző`}</TruncatedText>
          </div>
          <div className="flex justify-between items-center min-w-0">
            <span className="flex items-center gap-1 min-w-0">
              <Calendar className="h-2 w-2 flex-shrink-0" />
              <TruncatedText>{formatDate(new Date(extraction.createdAt))}</TruncatedText>
            </span>
            {extraction.expiresAt && extraction.status === 'session' && (
              <TruncatedText className="text-amber-600">
                {`Lejár: ${formatDate(new Date(extraction.expiresAt))}`}
              </TruncatedText>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CompactExtractionCard.displayName = 'CompactExtractionCard';

const PDFExtractionList: React.FC<PDFExtractionListProps> = ({ 
  selectedExtraction, 
  onSelect, 
  onDelete 
}) => {
  const [extractions, setExtractions] = useState<PDFExtraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'session' | 'linked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [extractionToDelete, setExtractionToDelete] = useState<PDFExtraction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 20;

  // Load PDF extractions
  const loadExtractions = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const result = await window.electronAPI.pdfGetAllExtractions();
      setExtractions(result);
    } catch (error) {
      console.error('Failed to load PDF extractions:', error);
      setLoadError(error instanceof Error ? error.message : 'Hiba a PDF adatok betöltésekor');
      setExtractions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadExtractions();
  }, [loadExtractions]);

  // Handle deletion
  const handleRequestDelete = useCallback((extraction: PDFExtraction) => {
    setExtractionToDelete(extraction);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!extractionToDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete(extractionToDelete);
      await loadExtractions(); // Reload to get updated data
      setExtractionToDelete(null);
      
      // Clear selection if deleted extraction was selected
      if (selectedExtraction?.id === extractionToDelete.id) {
        // The parent component should handle clearing the selection
      }
    } catch (error) {
      console.error('Error deleting extraction:', error);
    } finally {
      setIsDeleting(false);
    }
  }, [extractionToDelete, onDelete, loadExtractions, selectedExtraction]);

  const handleCancelDelete = useCallback(() => {
    setExtractionToDelete(null);
  }, []);

  // Search debouncing effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(() => {
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter and search extractions with pagination
  const { filteredExtractions, totalPages, paginatedExtractions, stats } = useMemo(() => {
    let filtered = extractions;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(extraction =>
        extraction.filename.toLowerCase().includes(term) ||
        extraction.linkedSchedules.some(schedule => schedule.toLowerCase().includes(term))
      );
    }

    // Apply tab filter
    if (activeTab !== 'all') {
      filtered = filtered.filter(extraction => extraction.status === activeTab);
    }

    // Calculate stats
    const totalExtractions = extractions.length;
    const sessionCount = extractions.filter(e => e.status === 'session').length;
    const linkedCount = extractions.filter(e => e.status === 'linked').length;
    const expiringCount = extractions.filter(e => {
      if (e.status !== 'session' || !e.expiresAt) return false;
      const expiryTime = new Date(e.expiresAt).getTime();
      const now = Date.now();
      const hourFromNow = now + (60 * 60 * 1000);
      return expiryTime < hourFromNow;
    }).length;

    // Pagination
    const total = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

    return {
      filteredExtractions: filtered,
      totalPages: total,
      paginatedExtractions: paginated,
      stats: {
        totalExtractions,
        sessionCount,
        linkedCount,
        expiringCount
      }
    };
  }, [extractions, searchTerm, activeTab, currentPage, itemsPerPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">PDF adatok betöltése...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with expiring count indicator and Search and Filters */}
      <div className="flex-shrink-0 space-y-3 mb-3">
        {stats.expiringCount > 0 && (
          <div className="px-2">
            <Badge variant="outline" className="text-xs px-2 py-0 bg-amber-50 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stats.expiringCount} lejáró
            </Badge>
          </div>
        )}

        <div className="px-2 space-y-3">
          <ProfessionalSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Keresés fájlnév vagy időrend szerint..."
            isLoading={searchLoading}
          />
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-8">
              <TabsTrigger value="all" className="text-xs">
                Összes ({stats.totalExtractions})
              </TabsTrigger>
              <TabsTrigger value="session" className="text-xs">
                Munkamenet ({stats.sessionCount})
              </TabsTrigger>
              <TabsTrigger value="linked" className="text-xs">
                Kapcsolt ({stats.linkedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {/* PDF Extractions List */}
      <div className="flex-1 overflow-auto pr-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Betöltés...</span>
          </div>
        ) : loadError ? (
          <StandardEmptyState
            type='no-data'
            icon={AlertTriangle}
            title="Hiba a betöltés során"
            description={loadError}
            actionLabel="Újrapróbálás"
            onAction={loadExtractions}
          />
        ) : paginatedExtractions.length === 0 ? (
          <StandardEmptyState
            type={searchTerm ? 'no-results' : 'no-data'}
            icon={FileText}
            title={searchTerm ? 'Nincs találat' : 'Még nincs feldolgozott PDF'}
            description={searchTerm 
              ? 'Próbáljon más keresési kifejezést használni.'
              : 'Töltsön fel egy PDF fájlt a jobb oldalon.'
            }
          />
        ) : (
          <div className="space-y-2">
            {paginatedExtractions.map((extraction) => (
              <CompactExtractionCard
                key={extraction.id}
                extraction={extraction}
                isSelected={selectedExtraction?.id === extraction.id}
                onSelect={onSelect}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <CompactPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredExtractions.length}
        />
      )}

      {/* Confirmation Dialog for Extraction Deletion */}
      <ConfirmationDialog
        isOpen={extractionToDelete !== null}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="PDF adatok törlése"
        description={extractionToDelete 
          ? `Biztosan törölni szeretnéd a "${extractionToDelete.filename}" PDF feldolgozás adatait? Ez a művelet nem vonható vissza.`
          : ''
        }
        confirmLabel="Törlés"
        cancelLabel="Mégse"
        variant="destructive"
      />
    </div>
  );
};

export default PDFExtractionList;