import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { RuleWithConditions } from '../../../shared/types/race';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { TwoPanelLayout } from '../layout/TwoPanelLayout';
import ProfessionalSearch from '../common/ProfessionalSearch';
import StandardEmptyState from '../common/StandardEmptyState';
import CompactPagination from '../common/CompactPagination';
import TruncatedText from '../common/TruncatedText';
import { ConfirmationDialog } from '../dialogs';

interface RuleManagerProps {
  onCreateRule?: () => void;
  onEditRule?: (rule: RuleWithConditions) => void;
  selectedRule?: RuleWithConditions;
  children?: React.ReactNode; // For right panel content (RuleEditor)
  refreshTrigger?: number; // Optional trigger for external refresh requests
}

// Ultra-compact rule card component matching schedule builder aesthetic
const CompactRuleCard = React.memo(({ 
  rule, 
  isSelected,
  onEdit, 
  onRequestDelete, 
  onToggleActive 
}: {
  rule: RuleWithConditions;
  isSelected: boolean;
  onEdit: (rule: RuleWithConditions) => void;
  onRequestDelete: (rule: RuleWithConditions) => void;
  onToggleActive: (rule: RuleWithConditions, isActive: boolean) => void;
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleActive = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await onToggleActive(rule, !rule.isActive);
    } finally {
      setIsToggling(false);
    }
  }, [rule, onToggleActive]);

  const handleRequestDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestDelete(rule);
  }, [rule, onRequestDelete]);

  const getCompactSummary = useCallback(() => {
    const conditionsA = rule.conditions.filter(c => c.conditionSet === 'A');
    const conditionsB = rule.conditions.filter(c => c.conditionSet === 'B');
    return `${conditionsA.length}→${conditionsB.length} feltétel`;
  }, [rule.conditions]);

  return (
    <Card
      className={`transition-all hover:shadow-md group relative cursor-pointer ${
        !rule.isActive ? 'opacity-60 border-dashed' : ''
      } ${
        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
      }`}
      onClick={() => onEdit(rule)}
    >
      <CardContent className="p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TruncatedText className="text-sm font-medium">{rule.name}</TruncatedText>
            <Badge variant={rule.isActive ? 'default' : 'secondary'} className="text-xs px-1 py-0">
              {rule.isActive ? 'Aktív' : 'Inaktív'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
              disabled={isToggling}
              className="h-6 w-6 p-0"
            >
              {isToggling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : rule.isActive ? (
                <ToggleRight className="w-4 h-4 text-green-500" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-gray-400" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRequestDelete}
              className="h-6 w-6 p-0 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs px-1 py-0">
            {rule.minIntervalMinutes}p
          </Badge>
          <TruncatedText>{getCompactSummary()}</TruncatedText>
        </div>
        
        {rule.description && (
          <TruncatedText as="p" className="text-xs text-muted-foreground mt-1">
            {rule.description}
          </TruncatedText>
        )}
      </CardContent>
    </Card>
  );
});

const RuleManager: React.FC<RuleManagerProps> = ({
  onCreateRule,
  onEditRule,
  selectedRule,
  children,
  refreshTrigger
}) => {
  const [rules, setRules] = useState<RuleWithConditions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [stats, setStats] = useState({ totalRules: 0, activeRules: 0, inactiveRules: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [ruleToDelete, setRuleToDelete] = useState<RuleWithConditions | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const itemsPerPage = 20;

  // Load rules from database
  const loadRules = useCallback(async () => {
    try {
      setLoading(true);
      const [allRules, ruleStats] = await Promise.all([
        window.electronAPI.getAllRules(),
        window.electronAPI.getRuleStats()
      ]);
      setRules(allRules);
      setStats(ruleStats);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Handle external refresh requests
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadRules();
    }
  }, [refreshTrigger, loadRules]);

  // Handle rule operations
  const handleToggleActive = useCallback(async (rule: RuleWithConditions, isActive: boolean) => {
    try {
      await window.electronAPI.toggleRuleActive(rule.id, isActive);
      
      // Optimistically update local state instead of full reload
      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, isActive } : r
      ));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        activeRules: isActive ? prev.activeRules + 1 : prev.activeRules - 1,
        inactiveRules: isActive ? prev.inactiveRules - 1 : prev.inactiveRules + 1
      }));
    } catch (error) {
      console.error('Error toggling rule:', error);
      // Only reload on error to restore correct state
      await loadRules();
    }
  }, [loadRules]);

  const handleRequestDelete = useCallback((rule: RuleWithConditions) => {
    setRuleToDelete(rule);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!ruleToDelete) return;
    
    setIsDeleting(true);
    try {
      await window.electronAPI.deleteRule(ruleToDelete.id);
      
      // Optimistically remove from local state
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalRules: prev.totalRules - 1,
        activeRules: ruleToDelete.isActive ? prev.activeRules - 1 : prev.activeRules,
        inactiveRules: ruleToDelete.isActive ? prev.inactiveRules : prev.inactiveRules - 1
      }));
      
      setRuleToDelete(null);
    } catch (error) {
      console.error('Error deleting rule:', error);
      // Only reload on error to restore correct state
      await loadRules();
    } finally {
      setIsDeleting(false);
    }
  }, [ruleToDelete, loadRules]);

  const handleCancelDelete = useCallback(() => {
    setRuleToDelete(null);
  }, []);

  // Debounced search effect
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

  // Filter and search rules with pagination
  const { filteredRules, totalPages, paginatedRules } = useMemo(() => {
    let filtered = rules;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.name.toLowerCase().includes(term) ||
        rule.description?.toLowerCase().includes(term)
      );
    }

    // Apply tab filter
    switch (activeTab) {
      case 'active':
        filtered = filtered.filter(rule => rule.isActive);
        break;
      case 'inactive':
        filtered = filtered.filter(rule => !rule.isActive);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Calculate pagination
    const total = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      filteredRules: filtered,
      totalPages: total,
      paginatedRules: paginated
    };
  }, [rules, searchTerm, activeTab, currentPage, itemsPerPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  return (
    <TwoPanelLayout>
      <TwoPanelLayout.SidePanel title={`Szabályok (${stats.totalRules})`}>
        {/* Search and Filters */}
        <div className="flex-shrink-0 space-y-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ProfessionalSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Keresés szabályok között..."
                isLoading={searchLoading}
              />
            </div>
            <Button
              size="sm"
              onClick={onCreateRule}
              disabled={!onCreateRule}
              className="h-8 px-3 flex-shrink-0"
            >
              <Plus className="h-3 w-3 mr-1" />
              Új szabály
            </Button>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-8">
              <TabsTrigger value="all" className="text-xs">
                Összes ({stats.totalRules})
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs">
                Aktív ({stats.activeRules})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="text-xs">
                Inaktív ({stats.inactiveRules})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Rules List */}
        <div className="flex-1 overflow-auto">
          <ScrollArea className="h-full pr-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Szabályok betöltése...</span>
              </div>
            ) : paginatedRules.length === 0 ? (
              <StandardEmptyState
                type={searchTerm ? 'no-results' : 'action-prompt'}
                title={searchTerm ? 'Nincs találat' : 'Nincsenek szabályok'}
                description={searchTerm ? 'Próbálj meg más keresési feltételt.' : 'Hozz létre egy új szabályt a kezdéshez.'}
                actionLabel={!searchTerm ? 'Új szabály' : undefined}
                onAction={!searchTerm ? onCreateRule : undefined}
              />
            ) : (
              <div className="space-y-2">
                {paginatedRules.map((rule) => (
                  <CompactRuleCard
                    key={rule.id}
                    rule={rule}
                    isSelected={selectedRule?.id === rule.id}
                    onEdit={onEditRule || (() => {})}
                    onRequestDelete={handleRequestDelete}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <CompactPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredRules.length}
          />
        )}
      </TwoPanelLayout.SidePanel>
      
      <TwoPanelLayout.MainPanel>
        {children || (
          <StandardEmptyState
            type="action-prompt"
            title="Válassz egy szabályt a szerkesztéshez"
            description="Kattints egy szabályra a bal oldali listában a szerkesztés megkezdéséhez."
            actionLabel="Új szabály létrehozása"
            onAction={onCreateRule}
          />
        )}
      </TwoPanelLayout.MainPanel>

      {/* Confirmation Dialog for Rule Deletion */}
      <ConfirmationDialog
        isOpen={ruleToDelete !== null}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Szabály törlése"
        description={ruleToDelete ? `Biztosan törölni szeretnéd a "${ruleToDelete.name}" szabályt? Ez a művelet nem vonható vissza.` : ''}
        confirmLabel="Törlés"
        cancelLabel="Mégse"
        variant="destructive"
      />
    </TwoPanelLayout>
  );
};

export default RuleManager;