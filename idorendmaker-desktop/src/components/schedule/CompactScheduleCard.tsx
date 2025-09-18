import React from 'react';
import { Calendar, Database } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Schedule } from '../../../shared/types/race';

// Extended schedule type with PDF status
interface ScheduleWithPDFStatus extends Schedule {
  hasPDFData?: boolean;
}

interface CompactScheduleCardProps {
  schedule: ScheduleWithPDFStatus;
  isSelected: boolean;
  onClick: (schedule: ScheduleWithPDFStatus) => void;
}

/**
 * CompactScheduleCard
 *
 * Compact schedule card for left panel list display.
 * Follows the same compact patterns as CompactRuleCard from RuleManager.
 */
const CompactScheduleCard: React.FC<CompactScheduleCardProps> = React.memo(({
  schedule,
  isSelected,
  onClick
}) => {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  // Check if modified date is different from created date
  const isModified = () => {
    const createdTime = new Date(schedule.createdAt).getTime();
    const updatedTime = new Date(schedule.updatedAt).getTime();
    // Consider dates different if more than 1 minute apart to account for minor timing differences
    return Math.abs(updatedTime - createdTime) > 60000;
  };

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/50'}
      `}
      onClick={() => onClick(schedule)}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header with icon and name */}
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0 mt-0.5">
              <Calendar className="h-3 w-3 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">
                {schedule.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                {schedule.hasPDFData && (
                  <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                    <Database className="h-2.5 w-2.5 mr-0.5" />
                    PDF
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-0.5 text-xs text-muted-foreground pl-6">
            <div className="flex items-center gap-1">
              <span>Létrehozva:</span>
              <span>{formatDate(schedule.createdAt)}</span>
            </div>
            {isModified() && (
              <div className="flex items-center gap-1">
                <span>Módosítva:</span>
                <span>{formatDate(schedule.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CompactScheduleCard.displayName = 'CompactScheduleCard';

export default CompactScheduleCard;
export type { ScheduleWithPDFStatus };