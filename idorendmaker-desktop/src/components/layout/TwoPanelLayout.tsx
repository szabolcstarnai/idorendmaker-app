import React from 'react';
import { cn } from '../../lib/utils';

interface TwoPanelLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface SidePanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  width?: 'narrow' | 'standard' | 'wide'; // 25%, 33%, 40%
}

interface MainPanelProps {
  children: React.ReactNode;
  className?: string;
}

interface ProfessionalHeaderProps {
  title: string;
  actions?: React.ReactNode;
  className?: string;
}

// Define the compound component type
interface TwoPanelLayoutComponent extends React.FC<TwoPanelLayoutProps> {
  SidePanel: React.FC<SidePanelProps>;
  MainPanel: React.FC<MainPanelProps>;
  Header: React.FC<ProfessionalHeaderProps>;
}

/**
 * TwoPanelLayout
 * 
 * Provides the standard two-panel layout used throughout the application.
 * Matches the schedule builder's information-dense, professional aesthetic.
 */
const TwoPanelLayoutBase: React.FC<TwoPanelLayoutProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn("h-full flex flex-col", className)}>
      <div className="flex-1 flex min-h-0">
        {children}
      </div>
    </div>
  );
};

/**
 * SidePanel
 * 
 * Left panel component for selection, filtering, and browsing.
 * Optimized for information density and professional functionality.
 */
export const SidePanel: React.FC<SidePanelProps> = ({ 
  children, 
  title,
  className,
  width = 'standard'
}) => {
  const widthClasses = {
    narrow: 'w-1/4',      // 25% - minimal sidebar
    standard: 'w-1/3',    // 33% - default, matches schedule builder
    wide: 'w-2/5'         // 40% - when more content needed
  };

  return (
    <aside className={cn(
      "bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden",
      widthClasses[width],
      className
    )}>
      {title && (
        <div className="flex-shrink-0 p-2 pb-0">
          <h2 className="text-base font-semibold text-foreground">
            {title}
          </h2>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </aside>
  );
};

/**
 * MainPanel
 * 
 * Right panel component for main workspace and detailed views.
 * Provides maximum space for content and actions.
 */
export const MainPanel: React.FC<MainPanelProps> = ({ 
  children, 
  className 
}) => {
  return (
    <main className={cn("flex-1 flex flex-col overflow-hidden", className)}>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </main>
  );
};

/**
 * ProfessionalHeader
 * 
 * Compact, professional header for consistent navigation across views.
 * Maximum 40px height to preserve screen real estate.
 */
export const ProfessionalHeader: React.FC<ProfessionalHeaderProps> = ({
  title,
  actions,
  className
}) => {
  return (
    <header className={cn(
      "flex-shrink-0 h-10 border-b border-border bg-background",
      "flex items-center justify-between px-2",
      className
    )}>
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold text-foreground">
          {title}
        </h1>
      </div>
      {actions && (
        <div className="flex items-center gap-1">
          {actions}
        </div>
      )}
    </header>
  );
};

// Compound component pattern for easy usage
const TwoPanelLayout = TwoPanelLayoutBase as TwoPanelLayoutComponent;
TwoPanelLayout.SidePanel = SidePanel;
TwoPanelLayout.MainPanel = MainPanel;
TwoPanelLayout.Header = ProfessionalHeader;

export { TwoPanelLayout };
export default TwoPanelLayout;