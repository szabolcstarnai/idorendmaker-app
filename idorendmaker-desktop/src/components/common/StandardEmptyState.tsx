import React from 'react';
import { LucideIcon, AlertCircle, Search, FileX, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface StandardEmptyStateProps {
  type?: 'no-data' | 'no-results' | 'action-prompt';
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * StandardEmptyState
 * 
 * Consistent empty state component matching schedule builder patterns.
 * Professional styling with helpful messaging and optional actions.
 */
const StandardEmptyState: React.FC<StandardEmptyStateProps> = ({
  type = 'no-data',
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  onAction,
  className
}) => {
  // Default icons for different types
  const defaultIcons = {
    'no-data': FileX,
    'no-results': Search,
    'action-prompt': Plus
  };

  const Icon = CustomIcon || defaultIcons[type] || AlertCircle;

  return (
    <div className={cn("text-center py-8", className)}>
      <Icon className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground mb-2 font-medium">
        {title}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground mb-4">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default StandardEmptyState;