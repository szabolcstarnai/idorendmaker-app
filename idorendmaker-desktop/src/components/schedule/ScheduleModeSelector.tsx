import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ArrowLeft, Zap, Settings, CheckCircle2, Users } from 'lucide-react';
import { ScheduleMode } from '../../../shared/types/race';

interface ScheduleModeSelectorProps {
  onModeSelect: (mode: ScheduleMode) => void;
  onBack: () => void;
}

const ScheduleModeSelector: React.FC<ScheduleModeSelectorProps> = ({ onModeSelect, onBack }) => {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with back button */}
      <div className="flex-shrink-0 p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Vissza
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Időrend mód kiválasztása</h1>
            <p className="text-sm text-muted-foreground">Válassza ki az időrend típusát igényei szerint</p>
          </div>
        </div>
      </div>
      
      {/* Mode selection cards */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          
          {/* Simplified Mode */}
          <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50" onClick={() => onModeSelect('simplified')}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Egyszerű mód</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>Csak egy futamszint használható: <strong>Döntő I.</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>Kis versenyekhez</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>Egy versenyszám egyszer hozzáadható</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModeSelect('simplified');
                  }}
                >
                  Kezdés
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Full Mode */}
          <Card className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/50" onClick={() => onModeSelect('full')}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Settings className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Teljes mód</h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span><strong>Összes futamszint</strong> használható (Döntő, Előfutam, Középfutam)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>Nagyobb versenyekhez</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>Ugyanaz a versenyszám többször hozzáadható</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="ml-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModeSelect('full');
                  }}
                >
                  Kezdés
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModeSelector;