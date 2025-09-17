import React from 'react';
import { Timer } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface IntervalSeparatorProps {
  index: number;
  interval: number;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (index: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  formatInterval: (minutes: number) => string;
}

// Hungarian strings for UI text
const hungarianStrings = {
  clickToEditInterval: 'Kattintson a szünet módosításához'
};

/**
 * Interval Separator Component
 * 
 * Renders the visual interval separator between races with inline editing.
 * Shows dashed line with clickable interval badge that can be edited.
 */
const IntervalSeparator: React.FC<IntervalSeparatorProps> = React.memo(({
  index,
  interval,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  formatInterval
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  return (
    <div className="flex items-center justify-center py-0.5 px-2 mx-2">
      <div className="flex-1 border-t border-dashed border-gray-300"></div>
      
      {isEditing ? (
        <div className="mx-2 flex items-center gap-1">
          <Input
            type="number"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-16 h-6 text-xs px-1"
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onSaveEdit}
          >
            ✓
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onCancelEdit}
          >
            ✕
          </Button>
        </div>
      ) : (
        <div 
          className="mx-2 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-xs font-mono text-blue-700 cursor-pointer hover:bg-blue-100 hover:border-blue-300 active:bg-blue-200 transition-colors select-none"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartEdit(index);
          }}
          title={hungarianStrings.clickToEditInterval}
        >
          <Timer className="w-3 h-3 mr-1 inline" />
          {formatInterval(interval)}
        </div>
      )}
      
      <div className="flex-1 border-t border-dashed border-gray-300"></div>
    </div>
  );
});

IntervalSeparator.displayName = 'IntervalSeparator';

export default IntervalSeparator;