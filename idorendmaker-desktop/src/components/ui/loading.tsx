import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// Standardized loading spinner variants
export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * StandardLoadingSpinner
 *
 * Consistent Loader2 icon with standardized sizing across the application.
 * Based on the preferred RuleManager pattern.
 */
export const StandardLoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'sm',
  className
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', // Standard size - matches RuleManager
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Loader2
      className={cn(
        'animate-spin text-muted-foreground',
        sizeClasses[size],
        className
      )}
    />
  );
};

// Loading state for tabbed panels - keeps tabs visible like RuleManager
export interface TabbedPanelLoadingProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * TabbedPanelLoading
 *
 * Loading state for components with tabs - preserves navigation structure
 * while showing spinner in content area. Matches RuleManager behavior.
 */
export const TabbedPanelLoading: React.FC<TabbedPanelLoadingProps> = ({
  message = 'Betöltés...',
  size = 'sm',
  className
}) => {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <StandardLoadingSpinner size={size} className="mr-2" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
};

// Loading state for full content replacement
export interface FullContentLoadingProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * FullContentLoading
 *
 * Loading state that replaces entire content area while maintaining
 * consistent spinner and text patterns.
 */
export const FullContentLoading: React.FC<FullContentLoadingProps> = ({
  message = 'Betöltés...',
  size = 'md',
  className
}) => {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <StandardLoadingSpinner size={size} className="mr-2" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
};

// Inline loading state for contextual loading
export interface InlineLoadingStateProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * InlineLoadingState
 *
 * Small, embedded loading indicator for contextual loading like
 * rule checking in ScheduleBuilder.
 */
export const InlineLoadingState: React.FC<InlineLoadingStateProps> = ({
  message,
  size = 'sm',
  className
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StandardLoadingSpinner size={size} />
      {message && (
        <span className="text-sm text-muted-foreground">{message}</span>
      )}
    </div>
  );
};

// Compact loading state for small spaces
export interface CompactLoadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * CompactLoading
 *
 * Just the spinner without text for very small spaces
 */
export const CompactLoading: React.FC<CompactLoadingProps> = ({
  size = 'xs',
  className
}) => {
  return <StandardLoadingSpinner size={size} className={className} />;
};