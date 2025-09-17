import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface CompactPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems: number;
  className?: string;
}

/**
 * CompactPagination
 * 
 * Professional, space-efficient pagination matching schedule builder aesthetic.
 * Shows minimal information while providing necessary navigation controls.
 */
const CompactPagination: React.FC<CompactPaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 50,
  totalItems,
  className
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center justify-between pt-2 border-t border-border",
      className
    )}>
      <span className="text-xs text-muted-foreground">
        {startIndex}-{endIndex} / {totalItems}
      </span>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="outline"
          disabled={!hasPrevious}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-6 w-6"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-6 w-6"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default CompactPagination;