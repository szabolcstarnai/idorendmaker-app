import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Save, X, AlertCircle, CheckCircle } from 'lucide-react';
import { RuleWithConditions, CreateRuleData } from '../../../shared/types/race';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { LegacyCollapsible } from '../ui/collapsible';
import ConditionBuilder from './ConditionBuilder';

interface RuleEditorProps {
  rule?: RuleWithConditions;
  onSave?: (ruleData: CreateRuleData) => Promise<void>;
  onCancel?: () => void;
  className?: string;
  compact?: boolean; // For right-panel mode
  onUnsavedChanges?: (hasChanges: boolean, type?: 'schedule' | 'rule', saveFunction?: () => Promise<void> | void, canSave?: boolean) => void;
}

// Available matching fields
const MATCHING_FIELDS = [
  { value: 'discipline', label: 'Szakág', description: 'Ugyanaz a szakág (Kajak, Kenu, stb.)' },
  { value: 'boatClass', label: 'Hajóosztály', description: 'Ugyanaz a hajóosztály (K1, C2, stb.)' },
  { value: 'gender', label: 'Nem', description: 'Ugyanaz a nem (Férfi, Női, Vegyes)' },
  { value: 'distance', label: 'Távolság', description: 'Ugyanaz a távolság (500m, 1000m, stb.)' },
  { value: 'ageGroups', label: 'Korosztály', description: 'Van átfedés a korosztályokban' },
  { value: 'level', label: 'Futamszint', description: 'Ugyanaz a futamszint (Döntő I., A Döntő, stb.)' },
  { value: 'levelType', label: 'Futamszint típus', description: 'Ugyanaz a futamszint típus (döntő, előfutam, középfutam)' },
  { value: 'seatCount', label: 'Ülésszám', description: 'Ugyanaz az ülésszám (egyes, páros, stb.)' },
  { value: 'boatType', label: 'Hajótípus', description: 'Ugyanaz a hajótípus (pl. Minikajak, Túrakenu, stb.)' },
  { value: 'baseRaceId', label: 'Ugyanaz a versenyszám', description: 'Ugyanaz a versenyszám alapja (különböző szinteken)' }
];

const CompactMatchingSelector: React.FC<{
  selectedFields: string[];
  onChange: (fields: string[]) => void;
}> = ({ selectedFields, onChange }) => {
  const handleFieldToggle = useCallback((fieldValue: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedFields, fieldValue]);
    } else {
      onChange(selectedFields.filter(f => f !== fieldValue));
    }
  }, [selectedFields, onChange]);

  return (
    <LegacyCollapsible 
      title={`Egyeztetési feltételek (${selectedFields.length})`}
      defaultOpen={false}
    >
      <div className="grid grid-cols-2 gap-3">
        {MATCHING_FIELDS.map(field => {
          const isSelected = selectedFields.includes(field.value);
          return (
            <div key={field.value} className="flex items-start space-x-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => handleFieldToggle(field.value, checked as boolean)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label className="text-xs font-medium cursor-pointer">
                  {field.label}
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {field.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {selectedFields.length === 0 && (
        <div className="flex items-center gap-2 text-amber-600 text-xs p-2 bg-amber-50 rounded-md border border-amber-200 mt-2">
          <AlertCircle className="h-3 w-3" />
          <span>Legalább egy egyeztetési feltétel szükséges!</span>
        </div>
      )}
    </LegacyCollapsible>
  );
};


const RuleEditor: React.FC<RuleEditorProps> = ({ 
  rule, 
  onSave, 
  onCancel, 
  className = '',
  compact = false,
  onUnsavedChanges
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minIntervalMinutes, setMinIntervalMinutes] = useState(60);
  const [conditions, setConditions] = useState<any[]>([]);
  const [matchingFields, setMatchingFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isNameInputActive, setIsNameInputActive] = useState(false);
  const justSavedRef = useRef(false);

  // Initialize form data from rule (for editing)
  useEffect(() => {
    // Reset the "just saved" flag when initializing/switching rules
    justSavedRef.current = false;
    
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || '');
      setMinIntervalMinutes(rule.minIntervalMinutes);
      setConditions(rule.conditions.map(c => ({
        conditionSet: c.conditionSet,
        field: c.field,
        operator: c.operator,
        value: c.value
      })));
      setMatchingFields(rule.matchings.map(m => m.field));
      setIsNameInputActive(true); // Editing existing rule
    } else {
      // Initialize with default values for new rule
      setName('');
      setDescription('');
      setMinIntervalMinutes(60);
      setConditions([]);
      setMatchingFields(['gender', 'ageGroups']); // Sensible defaults
      setIsNameInputActive(false); // Start with button mode
    }
  }, [rule]);

  // Track unsaved changes - use memo to calculate changes and prevent infinite loops
  const hasUnsavedChanges = useMemo(() => {
    // If we just saved successfully, don't show unsaved changes
    if (justSavedRef.current) {
      return false;
    }
    
    if (rule) {
      // Editing existing rule - check if any field has changed
      const nameChanged = name !== rule.name;
      const descriptionChanged = description !== (rule.description || '');
      const intervalChanged = minIntervalMinutes !== rule.minIntervalMinutes;
      
      // Check if conditions changed
      const originalConditions = rule.conditions.map(c => ({
        conditionSet: c.conditionSet,
        field: c.field,
        operator: c.operator,
        value: c.value
      }));
      const conditionsChanged = JSON.stringify(conditions) !== JSON.stringify(originalConditions);
      
      // Check if matching fields changed
      const originalMatchingFields = rule.matchings.map(m => m.field).sort();
      const currentMatchingFields = [...matchingFields].sort();
      const matchingFieldsChanged = JSON.stringify(originalMatchingFields) !== JSON.stringify(currentMatchingFields);
      
      return nameChanged || descriptionChanged || intervalChanged || conditionsChanged || matchingFieldsChanged;
    } else {
      // Creating new rule - has changes if any field is filled
      const hasName = name.trim().length > 0;
      const hasDescription = description.trim().length > 0;
      const hasNonDefaultInterval = minIntervalMinutes !== 60;
      const hasConditions = conditions.length > 0;
      const hasNonDefaultMatching = JSON.stringify([...matchingFields].sort()) !== JSON.stringify(['ageGroups', 'gender']);
      
      return hasName || hasDescription || hasNonDefaultInterval || hasConditions || hasNonDefaultMatching;
    }
  }, [name, description, minIntervalMinutes, conditions, matchingFields, rule]);

  // Only notify when unsaved changes state actually changes
  const previousChangesRef = useRef<boolean>(false);
  useEffect(() => {
    if (!onUnsavedChanges) return;
    
    if (hasUnsavedChanges !== previousChangesRef.current) {
      previousChangesRef.current = hasUnsavedChanges;
      
      if (hasUnsavedChanges) {
        // Provide save function that validates and calls onSave
        const saveFunction = async () => {
          if (isValid && onSave) {
            const ruleData: CreateRuleData = {
              name: name.trim(),
              description: description.trim() || undefined,
              minIntervalMinutes,
              conditions: conditions.map(c => ({
                conditionSet: c.conditionSet,
                field: c.field,
                operator: c.operator,
                value: c.value
              })),
              matchings: matchingFields.map(field => ({ field }))
            };
            await onSave(ruleData);
          }
        };
        
        onUnsavedChanges(true, 'rule', saveFunction, isValid);
      } else {
        onUnsavedChanges(false);
      }
    }
  }, [hasUnsavedChanges]); // Only depend on the memoized boolean

  // Validation
  const isValid = useMemo(() => {
    const hasName = name.trim().length > 0;
    const hasValidInterval = minIntervalMinutes > 0;
    const hasConditionsA = conditions.some(c => c.conditionSet === 'A');
    const hasConditionsB = conditions.some(c => c.conditionSet === 'B');
    const conditionsValid = conditions.every(c => c.field && c.operator && c.value.trim());
    
    return hasName && hasValidInterval && hasConditionsA && hasConditionsB && conditionsValid;
  }, [name, minIntervalMinutes, conditions]);

  // Get conditions for each set
  const conditionsA = useMemo(() => conditions.filter(c => c.conditionSet === 'A'), [conditions]);
  const conditionsB = useMemo(() => conditions.filter(c => c.conditionSet === 'B'), [conditions]);

  // Handle smart button activation
  const handleNameButtonClick = useCallback(() => {
    setIsNameInputActive(true);
  }, []);

  // Handle name input escape
  const handleNameInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !rule) {
      setIsNameInputActive(false);
      setName('');
    }
  }, [rule]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!isValid || !onSave) return;

    setSaving(true);
    try {
      const ruleData: CreateRuleData = {
        name: name.trim(),
        description: description.trim() || undefined,
        minIntervalMinutes,
        conditions: conditions.map(c => ({
          conditionSet: c.conditionSet,
          field: c.field,
          operator: c.operator,
          value: c.value.trim()
        })),
        matchings: matchingFields.map(field => ({ field }))
      };

      await onSave(ruleData);
      // Mark as successfully saved to prevent unsaved changes warning
      justSavedRef.current = true;
    } catch (error) {
      console.error('Error saving rule:', error);
    } finally {
      setSaving(false);
    }
  }, [isValid, onSave, name, description, minIntervalMinutes, conditions, matchingFields]);

  if (compact) {
    // Compact right-panel mode
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Compact Header - Minimal */}
        <div className="flex-shrink-0 p-2 border-b">
          <div className="flex items-center justify-between">
            {rule || isNameInputActive ? (
              <h2 className="text-base font-semibold">
                {rule ? 'Szabály szerkesztése' : 'Új szabály létrehozása'}
              </h2>
            ) : (
              <Button 
                variant="ghost" 
                onClick={handleNameButtonClick}
                className="text-base font-semibold p-0 h-auto hover:bg-transparent hover:text-primary"
              >
                Új szabály létrehozása
              </Button>
            )}
            <div className="flex items-center gap-1">
              {!isValid && (
                <Badge variant="destructive" className="text-xs px-1 py-0">
                  Hibás
                </Badge>
              )}
              {isValid && (
                <Badge variant="default" className="text-xs px-1 py-0">
                  Érvényes
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Compact Content */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full pr-3">
            <div className="p-2 space-y-3">
              {/* Rule Settings - Following Schedule Builder Pattern */}
              <LegacyCollapsible 
                title="Beállítások" 
                defaultOpen={false}
                className="mb-3"
              >
                <Card>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-foreground mb-0.5">
                          Szabály neve *
                        </label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onKeyDown={handleNameInputKeyDown}
                          placeholder="Szabály neve"
                          className={`h-8 ${!name.trim() ? 'border-destructive' : ''}`}
                          autoFocus={!rule && isNameInputActive}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-foreground mb-0.5">
                          Időköz (p) *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="1440"
                          value={minIntervalMinutes}
                          onChange={(e) => setMinIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                          className={`h-8 ${minIntervalMinutes <= 0 ? 'border-destructive' : ''}`}
                        />
                      </div>
                      <div className="md:col-span-7">
                        <label className="block text-xs font-medium text-foreground mb-0.5">
                          Leírás
                        </label>
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Rövid leírás"
                          className="h-8"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-xs text-muted-foreground">
                        {conditionsA.length + conditionsB.length} feltétel • {matchingFields.length} egyeztetési mező
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={onCancel} className="flex items-center h-8 px-3">
                          <X className="h-3 w-3 mr-1" />
                          Mégse
                        </Button>
                        <Button 
                          size="sm"
                          onClick={handleSave} 
                          disabled={!isValid || saving}
                          className="flex items-center h-8 px-3"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          {saving ? 'Mentés...' : 'Mentés'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </LegacyCollapsible>

              {/* Condition Builders - Compact Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <ConditionBuilder
                  conditions={conditions}
                  conditionSet="A"
                  title="Csoport A"
                  description="Első csoport feltételei"
                  onChange={setConditions}
                  compact
                />
                
                <ConditionBuilder
                  conditions={conditions}
                  conditionSet="B"
                  title="Csoport B"
                  description="Második csoport feltételei"
                  onChange={setConditions}
                  compact
                />
              </div>

              {/* Matching Fields - Compact */}
              <CompactMatchingSelector
                selectedFields={matchingFields}
                onChange={setMatchingFields}
              />

            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Full-page mode (legacy)
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">
            {rule ? 'Szabály Szerkesztése' : 'Új szabály létrehozása'}
          </h1>
          {!isValid && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Hibás
            </Badge>
          )}
          {isValid && (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Érvényes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Mégse
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!isValid || saving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Mentés...' : 'Mentés'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alapadatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Szabály neve *
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleNameInputKeyDown}
                    placeholder="pl. Kajak egyes/páros minimum időköz"
                    className={!name.trim() ? 'border-destructive' : ''}
                    autoFocus={!rule && isNameInputActive}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Leírás (opcionális)
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="pl. 60 perc minimum időköz Kajak egyes és Kajak páros között"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Minimum időköz (percben) *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="1440"
                    value={minIntervalMinutes}
                    onChange={(e) => setMinIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                    className={minIntervalMinutes <= 0 ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum {minIntervalMinutes} percnek kell eltelnie a két versenyszám között.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Condition Builders */}
            <div className="grid gap-6 lg:grid-cols-2">
              <ConditionBuilder
                conditions={conditions}
                conditionSet="A"
                title="Versenyszám Csoport A"
                description="Első csoportba tartozó versenyszámok feltételei"
                onChange={setConditions}
              />
              
              <ConditionBuilder
                conditions={conditions}
                conditionSet="B"
                title="Versenyszám Csoport B"
                description="Második csoportba tartozó versenyszámok feltételei"
                onChange={setConditions}
              />
            </div>

            {/* Matching Fields */}
            <CompactMatchingSelector
              selectedFields={matchingFields}
              onChange={setMatchingFields}
            />

          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default RuleEditor;