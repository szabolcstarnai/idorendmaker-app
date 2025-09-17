import React from 'react';
import { Button } from '../ui/button';
import { Home } from 'lucide-react';

type AppView = 'main-menu' | 'create-schedule' | 'load-schedule' | 'rule-management' | 'rule-editor' | 'pdf-processor' | 'pdf-to-schedule';

interface NavbarProps {
  currentView: AppView;
  onNavigateHome: () => void;
  pageTitle?: string;
  showHomeButton?: boolean;
}

const getPageTitle = (view: AppView, customTitle?: string): string => {
  if (customTitle) return customTitle;
  
  switch (view) {
    case 'create-schedule':
      return 'Új időrend';
    case 'load-schedule':
      return 'Mentett időrendek';
    case 'rule-management':
      return 'Szabálykezelő';
    case 'rule-editor':
      return 'Szabály szerkesztése';
    case 'pdf-processor':
      return 'PDF feldolgozó';
    case 'pdf-to-schedule':
      return 'Új időrend (PDF adatok)';
    default:
      return 'Időrend készítő';
  }
};

const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onNavigateHome, 
  pageTitle,
  showHomeButton = true 
}) => {
  // Don't render navbar on main menu
  if (currentView === 'main-menu') {
    return null;
  }

  const title = getPageTitle(currentView, pageTitle);

  return (
    <nav className="h-10 bg-background border-b border-border flex items-center justify-between px-3 flex-shrink-0">
      {/* Left side - Home button and page title */}
      <div className="flex items-center gap-3">
        {showHomeButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateHome}
            className="h-8 px-2 text-slate-600 hover:text-slate-800 gap-1"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="text-xs">Főmenü</span>
          </Button>
        )}
        
        <div className="text-sm font-medium text-foreground">
          {title}
        </div>
      </div>

      {/* Right side - Reserved for future context actions or breadcrumbs */}
      <div className="flex items-center gap-2">
        {/* This space can be used for additional context actions in the future */}
      </div>
    </nav>
  );
};

export default Navbar;