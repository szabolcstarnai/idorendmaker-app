import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Plus, FolderOpen, Shield, Calendar, Trophy, FileText } from 'lucide-react';

interface MainMenuProps {
  onCreateNewSchedule: () => void;
  onLoadSchedule: () => void;
  onRuleManagement?: () => void;
  onPDFProcessor?: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onCreateNewSchedule, onLoadSchedule, onRuleManagement, onPDFProcessor }) => {
  const [stats, setStats] = useState({
    totalRaces: 0,
    totalSchedules: 0,
    totalRules: 0,
    loading: true
  });

  const [isHeightConstrained, setIsHeightConstrained] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load stats from database
        const [races, schedules, rules] = await Promise.all([
          window.electronAPI.getAllRaces().then(races => races.length),
          window.electronAPI.getAllSchedules ? window.electronAPI.getAllSchedules().then(schedules => schedules.length).catch(() => 0) : 0,
          window.electronAPI.getAllRules().then(rules => rules.length)
        ]);
        
        setStats({
          totalRaces: races,
          totalSchedules: schedules,
          totalRules: rules,
          loading: false
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  // Height-based responsive layout logic
  useEffect(() => {
    const checkHeight = () => {
      const windowHeight = window.innerHeight;
      
      // Calculate space needed for all content:
      // Header: ~100px (title + stats + padding)
      // Content padding: ~48px (p-6 top/bottom)
      // 4 cards: ~150px each = 600px
      // Card gaps: ~48px (3 gaps between cards)
      // Total needed: ~796px
      const totalSpaceNeeded = 800;
      
      // Switch to 2-column layout if window height is insufficient for 4 stacked cards
      setIsHeightConstrained(windowHeight < totalSpaceNeeded);
    };

    checkHeight();

    // Debounced resize handler to prevent excessive re-renders
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkHeight, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []); // Only run once on mount and handle resizes

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Enhanced Header with App Info and Stats */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center justify-between">
          {/* Left: App Title and Version */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">Időrend előkészítő</h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-2 py-0">
                  v2025.9.2
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Database Stats */}
          {!stats.loading && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{stats.totalRaces.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">versenyszám</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{stats.totalSchedules.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">időrend</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{stats.totalRules.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">szabály</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Professional Action Cards */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`w-full grid gap-4 ${
          isHeightConstrained 
            ? 'max-w-4xl grid-cols-2' 
            : 'max-w-2xl grid-cols-1'
        }`}>
          
          {/* Create New Schedule */}
          <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50" onClick={onCreateNewSchedule}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Új időrend</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span>Versenyzői adat nélküli egyszerű mód</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span>Versenyzői adat nélküli teljes mód</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateNewSchedule();
                  }}
                >
                  Kezdés
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Load Schedule */}
          <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50" onClick={onLoadSchedule}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FolderOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Mentett időrendek</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                      <span>Korábban készített időrendek megtekintése/szerkesztése</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FolderOpen className="h-4 w-4 text-blue-600" />
                      <span>Elkészült időrendek exportálása Excelbe</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSchedule();
                  }}
                >
                  Megnyitás
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rule Management */}
          {onRuleManagement && (
            <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50" onClick={onRuleManagement}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Szabályok</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span>Futamok közötti időköz szabályok létrehozása/szerkesztése</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span>Futamok közötti időköz szabályok inaktiválása/aktiválása</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="ml-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRuleManagement();
                    }}
                  >
                    Kezelés
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PDF Processor */}
          {onPDFProcessor && (
            <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50" onClick={onPDFProcessor}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Nevezési lista PDF feldolgozása</h3>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Időrend létrehozása versenyzői adatokkal</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span>Korábban feldolgozott PDF adatok kezelése</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="ml-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPDFProcessor();
                    }}
                  >
                    Indítás
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainMenu;