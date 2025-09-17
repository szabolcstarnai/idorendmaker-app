import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { LegacyCollapsible } from '../ui/collapsible';
import { 
  CONDITION_FIELDS, 
  OPERATORS, 
  getDropdownOptions, 
  fieldHasDropdown,
  fieldAllowsMultiSelect,
  DropdownValue 
} from '../../features/rules/constants/ruleConditions';
import TruncatedText from '../common/TruncatedText';

interface RuleCondition {
  conditionSet: 'A' | 'B';
  field: string;
  operator: string;
  value: string;
}

interface ConditionBuilderProps {
  conditions: RuleCondition[];
  conditionSet: 'A' | 'B';
  title: string;
  description?: string;
  onChange: (conditions: RuleCondition[]) => void;
  className?: string;
  compact?: boolean;
}

// Age groups will be loaded from database
interface AgeGroupOption extends DropdownValue {
  id: number;
}

// Levels will be loaded from database
interface LevelOption extends DropdownValue {
  id: number;
  levelType: string;
}

let ageGroups: AgeGroupOption[] = [];
let levels: LevelOption[] = [];

// Load age groups from database
const loadAgeGroups = async () => {
  if (ageGroups.length === 0 && window.electronAPI) {
    try {
      const dbAgeGroups = await window.electronAPI.getAllAgeGroups();
      ageGroups = dbAgeGroups.map(ag => ({
        id: ag.id,
        value: ag.name,
        label: ag.name
      }));
    } catch (error) {
      console.error('Error loading age groups:', error);
    }
  }
};

// Load levels from database
const loadLevels = async () => {
  if (levels.length === 0 && window.electronAPI) {
    try {
      const dbLevels = await window.electronAPI.getAllLevels();
      levels = dbLevels.map(level => ({
        id: level.id,
        value: level.name,
        label: level.name,
        levelType: level.levelType
      }));
    } catch (error) {
      console.error('Error loading levels:', error);
    }
  }
};

// Smart value input component that handles dropdowns and multi-select
const ValueInput: React.FC<{
  field: string;
  operator: string;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}> = ({ field, operator, value, onChange, compact = false }) => {
  const [dropdownOptions, setDropdownOptions] = useState<DropdownValue[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);

  // Load dropdown options when field changes
  useEffect(() => {
    const loadOptions = async () => {
      if (!fieldHasDropdown(field)) {
        setDropdownOptions([]);
        return;
      }

      let options = getDropdownOptions(field);
      
      if (field === 'ageGroups') {
        await loadAgeGroups();
        options = ageGroups;
      } else if (field === 'level') {
        await loadLevels();
        options = levels;
      }
      
      setDropdownOptions(options);
    };
    
    loadOptions();
  }, [field]);

  // Parse multi-select values from semicolon-separated string (avoiding comma conflicts with decimal numbers)
  useEffect(() => {
    if ((operator === 'in' || operator === 'not_in') && value) {
      setSelectedValues(value.split(';').map(v => v.trim()).filter(v => v));
    } else {
      setSelectedValues([]);
    }
  }, [value, operator]);

  // Update parent when multi-select changes
  const handleMultiSelectChange = useCallback((optionValue: string, checked: boolean) => {
    let newValues: string[];
    if (checked) {
      newValues = [...selectedValues, optionValue];
    } else {
      newValues = selectedValues.filter(v => v !== optionValue);
    }
    setSelectedValues(newValues);
    onChange(newValues.join('; '));
  }, [selectedValues, onChange]);

  const inputClass = compact ? 'h-8 text-sm px-3 py-1' : 'text-sm';
  const containerClass = compact ? 'space-y-2' : 'space-y-2';

  // Free text input for fields without dropdown
  if (!fieldHasDropdown(field)) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={getValuePlaceholder(field, operator)}
        disabled={!field || !operator}
        className={inputClass}
      />
    );
  }

  // Multi-select for "in" and "not_in" operators
  if ((operator === 'in' || operator === 'not_in') && fieldAllowsMultiSelect(field)) {
    return (
      <div className={containerClass}>
        <div className="border border-input rounded-md p-2 bg-background">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Kiválasztott értékek ({selectedValues.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${
                isMultiSelectOpen ? 'rotate-180' : ''
              }`} />
            </Button>
          </div>
          
          {selectedValues.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedValues.map((value, index) => (
                <Badge key={`badge-${index}-${value}`} variant="secondary" className="text-xs px-1 py-0">
                  {dropdownOptions.find(opt => opt.value === value)?.label || value}
                </Badge>
              ))}
            </div>
          )}
          
          {isMultiSelectOpen && (
            <div className={`grid gap-1 max-h-24 overflow-y-auto ${
              compact ? 'grid-cols-2' : 'grid-cols-3'
            }`}>
              {dropdownOptions.map((option, optionIndex) => {
                const safeId = `checkbox-${field.replace(/[^a-zA-Z0-9]/g, '_')}-${optionIndex}`;
                const safeKey = `${field}-option-${optionIndex}`;
                return (
                  <div key={safeKey} className="flex items-center space-x-2">
                    <Checkbox
                      id={safeId}
                      checked={selectedValues.includes(option.value)}
                      onCheckedChange={(checked) => handleMultiSelectChange(option.value, checked as boolean)}
                      className="h-4 w-4"
                    />
                    <label 
                      htmlFor={safeId}
                      className="text-sm cursor-pointer flex-1 min-w-0"
                    >
                      <TruncatedText>{option.label}</TruncatedText>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single dropdown for other operators
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!field || !operator}
      className={`w-full ${compact ? 'h-8 px-3 py-1 text-sm' : 'px-3 py-2 text-sm'} bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent`}
    >
      <option value="">Válassz értéket...</option>
      {dropdownOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

function getValuePlaceholder(field: string, operator: string): string {
  if (!field || !operator) return '';
  
  switch (field) {
    case 'name':
      return 'K1 Férfi Felnőtt 1000m';
    default:
      return '';
  }
}

const SingleCondition: React.FC<{
  condition: RuleCondition;
  index: number;
  onUpdate: (index: number, updated: Partial<RuleCondition>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  compact?: boolean;
}> = ({ condition, index, onUpdate, onRemove, canRemove, compact = false }) => {
  const selectedField = CONDITION_FIELDS.find(f => f.value === condition.field);
  const selectedOperator = OPERATORS.find(op => op.value === condition.operator);

  if (compact) {
    // Compact mode
    return (
      <div className="p-3 bg-muted/30 rounded border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Feltétel {index + 1}</span>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Mező
            </label>
            <select
              value={condition.field}
              onChange={(e) => onUpdate(index, { field: e.target.value, operator: '', value: '' })}
              className="w-full h-8 px-3 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Válassz mezőt...</option>
              {CONDITION_FIELDS.map(field => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Operátor
            </label>
            <select
              value={condition.operator}
              onChange={(e) => onUpdate(index, { operator: e.target.value, value: '' })}
              disabled={!condition.field}
              className="w-full h-8 px-3 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">Operátor...</option>
              {OPERATORS.map(operator => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Érték
            </label>
            <ValueInput
              field={condition.field}
              operator={condition.operator}
              value={condition.value}
              onChange={(value) => onUpdate(index, { value })}
              compact
            />
          </div>
        </div>
      </div>
    );
  }

  // Full-size mode
  return (
    <Card className="border-l-4 border-l-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline">Feltétel {index + 1}</Badge>
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-6 w-6 p-0 ml-auto text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid gap-3">
          {/* Field Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Mező
            </label>
            <select
              value={condition.field}
              onChange={(e) => onUpdate(index, { field: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">Válassz mezőt...</option>
              {CONDITION_FIELDS.map(field => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
            {selectedField && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedField.description}
              </p>
            )}
          </div>

          {/* Operator Selection */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Operátor
            </label>
            <select
              value={condition.operator}
              onChange={(e) => onUpdate(index, { operator: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              disabled={!condition.field}
            >
              <option value="">Válassz operátort...</option>
              {OPERATORS.map(op => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            {selectedOperator && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedOperator.description}
              </p>
            )}
          </div>

          {/* Value Input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Érték
            </label>
            <ValueInput
              field={condition.field}
              operator={condition.operator}
              value={condition.value}
              onChange={(value) => onUpdate(index, { value })}
              compact={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditions,
  conditionSet,
  title,
  description,
  onChange,
  className = '',
  compact = false
}) => {
  // Filter conditions for this set
  const setConditions = useMemo(() => 
    conditions.filter(c => c.conditionSet === conditionSet),
    [conditions, conditionSet]
  );

  const updateCondition = useCallback((index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    const globalIndex = newConditions.findIndex((c, i) => 
      c.conditionSet === conditionSet && 
      setConditions.findIndex(sc => sc === c) === index
    );
    
    if (globalIndex !== -1) {
      newConditions[globalIndex] = { ...newConditions[globalIndex], ...updates };
      onChange(newConditions);
    }
  }, [conditions, conditionSet, setConditions, onChange]);

  const removeCondition = useCallback((index: number) => {
    const newConditions = conditions.filter((c, i) => {
      if (c.conditionSet !== conditionSet) return true;
      const setIndex = setConditions.findIndex(sc => sc === c);
      return setIndex !== index;
    });
    onChange(newConditions);
  }, [conditions, conditionSet, setConditions, onChange]);

  const addCondition = useCallback(() => {
    const newCondition: RuleCondition = {
      conditionSet,
      field: '',
      operator: '',
      value: ''
    };
    onChange([...conditions, newCondition]);
  }, [conditions, conditionSet, onChange]);

  const isValid = useMemo(() => {
    return setConditions.length > 0 && setConditions.every(c => 
      c.field && c.operator && c.value.trim()
    );
  }, [setConditions]);

  const [isOpen, setIsOpen] = useState(!compact);

  if (compact) {
    // Compact collapsible mode
    return (
      <div className={className}>
        <LegacyCollapsible 
          title={`${title} (${setConditions.length})`}
          defaultOpen={isOpen}
        >
          <div className="space-y-3 min-h-0">
            {!isValid && setConditions.length > 0 && (
              <div className="flex items-center gap-1 text-amber-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                <span>Hiányos feltételek!</span>
              </div>
            )}
            
            {setConditions.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-xs mb-2">Nincsenek feltételek.</p>
                <Button 
                  onClick={addCondition} 
                  size="sm" 
                  variant="outline" 
                  className="gap-1 h-7 px-3 text-xs border-green-300 text-green-700 hover:bg-green-50 border-dashed"
                >
                  <Plus className="h-3 w-3" />
                  Feltétel
                </Button>
              </div>
            ) : (
              <>
                {setConditions.map((condition, index) => (
                  <SingleCondition
                    key={`${conditionSet}-${index}`}
                    condition={condition}
                    index={index}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                    canRemove={setConditions.length > 1}
                    compact
                  />
                ))}
                <Button 
                  onClick={addCondition} 
                  size="sm"
                  variant="outline" 
                  className="w-full gap-1 h-7 px-3 text-xs border-green-300 text-green-700 hover:bg-green-50 border-dashed mt-2"
                >
                  <Plus className="h-3 w-3" />
                  Feltétel (+)
                </Button>
              </>
            )}
          </div>
        </LegacyCollapsible>
      </div>
    );
  }

  // Full-size mode
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isValid && setConditions.length > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <Badge variant={isValid ? 'default' : 'secondary'}>
                {setConditions.length} feltétel
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {setConditions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="mb-3">Még nincsenek feltételek ehhez a csoporthoz.</p>
              <Button 
                onClick={addCondition} 
                variant="outline" 
                className="gap-2 border-green-300 text-green-700 hover:bg-green-50 border-dashed"
              >
                <Plus className="h-4 w-4" />
                Első Feltétel Hozzáadása
              </Button>
            </div>
          ) : (
            <>
              {setConditions.map((condition, index) => (
                <SingleCondition
                  key={`${conditionSet}-${index}`}
                  condition={condition}
                  index={index}
                  onUpdate={updateCondition}
                  onRemove={removeCondition}
                  canRemove={setConditions.length > 1}
                />
              ))}
              <Button 
                onClick={addCondition} 
                variant="outline" 
                className="w-full gap-2 mt-3 border-green-300 text-green-700 hover:bg-green-50 border-dashed"
              >
                <Plus className="h-4 w-4" />
                További Feltétel ({setConditions.length + 1}.)
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConditionBuilder;