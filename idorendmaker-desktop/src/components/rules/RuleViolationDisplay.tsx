import React, { useState, useCallback } from 'react';
import { AlertTriangle, AlertCircle, X, Clock, ArrowRight, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { RuleViolation } from '../../../shared/types/race';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import TruncatedText from '../common/TruncatedText';

interface RuleViolationDisplayProps {
  violations: RuleViolation[];
  className?: string;
  compact?: boolean;
  onDismiss?: (violationHash: string) => void;
  onShowRuleDetails?: (ruleId: number) => void;
  onHighlightRaces?: (violation: RuleViolation) => void;
}

const ViolationCard: React.FC<{
  violation: RuleViolation;
  compact?: boolean;
  onDismiss?: (violationHash: string) => void;
  onShowRuleDetails?: (ruleId: number) => void;
  onHighlightRaces?: (violation: RuleViolation) => void;
}> = ({ violation, compact = false, onDismiss, onShowRuleDetails, onHighlightRaces }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityIcon = useCallback(() => {
    switch (violation.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  }, [violation.severity]);

  const getSeverityColor = useCallback(() => {
    switch (violation.severity) {
      case 'error':
        return 'border-l-red-500 bg-red-50';
      case 'warning':
        return 'border-l-amber-500 bg-amber-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  }, [violation.severity]);

  const formatRaceName = useCallback((race: any) => {
    // Use the race name directly as it's more user-friendly
    return race.name || `${race.boatClass} ${race.gender} ${race.distance}`.trim();
  }, []);

  const formatTime = useCallback((minutes: number) => {
    if (minutes < 60) {
      return `${minutes} perc`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours} óra` : `${hours}ó ${mins}p`;
  }, []);

  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 px-3 py-2 border-l-4 ${getSeverityColor()} text-sm cursor-pointer hover:bg-opacity-70 transition-colors`}
        onClick={() => onHighlightRaces?.(violation)}
      >
        {getSeverityIcon()}
        <TruncatedText className="flex-1">{violation.message}</TruncatedText>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(violation.violationHash);
            }}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-l-4 ${getSeverityColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getSeverityIcon()}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={violation.severity === 'error' ? 'destructive' : 'secondary'}>
                {violation.severity === 'error' ? 'Konfliktus' : 'Figyelmeztetés'}
              </Badge>
              <span className="text-sm font-medium">{violation.rule.name}</span>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {violation.message}
            </p>

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground mb-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Kevesebb részlet
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Részletek
                  </>
                )}
              </Button>

              <div className="space-y-3">
                {/* Race Details */}
                <div className="grid gap-2 text-xs">
                  <div className="p-2 bg-background rounded border">
                    <div className="font-medium mb-1">Érintett versenyszámok:</div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        {formatRaceName(violation.race1)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        {formatRaceName(violation.race2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timing Details */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Jelenlegi: {formatTime(violation.actualIntervalMinutes)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Szükséges: {formatTime(violation.requiredIntervalMinutes)}</span>
                  </div>
                </div>

                {/* Rule Details */}
                {violation.rule.description && (
                  <div className="p-2 bg-muted/50 rounded text-xs">
                    <div className="font-medium mb-1">Szabály leírása:</div>
                    <div>{violation.rule.description}</div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {onShowRuleDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShowRuleDetails(violation.rule.id)}
                      className="h-7 text-xs"
                    >
                      Szabály megtekintése
                    </Button>
                  )}
                  {onDismiss && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(violation.violationHash)}
                      className="h-7 text-xs"
                    >
                      Elrejtés
                    </Button>
                  )}
                </div>
              </div>
            </Collapsible>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ViolationSummary: React.FC<{
  violations: RuleViolation[];
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}> = ({ violations, onExpandAll, onCollapseAll }) => {
  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  if (violations.length === 0) return null;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <Badge variant="destructive">{errorCount} konfliktus</Badge>
            </>
          )}
          {warningCount > 0 && (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <Badge variant="secondary">{warningCount} figyelmeztetés</Badge>
            </>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          Szabályok ellenőrzése alapján
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpandAll}
          className="h-7 text-xs"
        >
          Mind kinyit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapseAll}
          className="h-7 text-xs"
        >
          Mind bezár
        </Button>
      </div>
    </div>
  );
};

const RuleViolationDisplay: React.FC<RuleViolationDisplayProps> = ({
  violations,
  className = '',
  compact = false,
  onDismiss,
  onShowRuleDetails,
  onHighlightRaces
}) => {
  const [dismissedViolations, setDismissedViolations] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback((violationHash: string) => {
    setDismissedViolations(prev => new Set(prev).add(violationHash));
    onDismiss?.(violationHash);
  }, [onDismiss]);

  const visibleViolations = violations.filter(violation => !dismissedViolations.has(violation.violationHash));

  if (visibleViolations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {!compact && (
        <ViolationSummary violations={visibleViolations} />
      )}
      
      <div className={compact ? 'space-y-1' : 'space-y-3'}>
        {visibleViolations.map((violation) => (
          <ViolationCard
            key={violation.violationHash}
            violation={violation}
            compact={compact}
            onDismiss={handleDismiss}
            onShowRuleDetails={onShowRuleDetails}
            onHighlightRaces={onHighlightRaces}
          />
        ))}
      </div>
    </div>
  );
};

export default RuleViolationDisplay;