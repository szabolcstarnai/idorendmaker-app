import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';

interface ProfessionalSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * ProfessionalSearch
 * 
 * Standardized search input component matching the schedule builder aesthetic.
 * Includes loading state and consistent styling across the application.
 */
const ProfessionalSearch: React.FC<ProfessionalSearchProps> = ({
  value,
  onChange,
  placeholder = "Keresés...",
  isLoading = false,
  className
}) => {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 h-8"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
};

export default ProfessionalSearch;