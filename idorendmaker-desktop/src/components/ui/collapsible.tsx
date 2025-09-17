import React, { createContext, useContext, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

// Context for sharing collapsible state
interface CollapsibleContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = createContext<CollapsibleContextType | undefined>(undefined);

const useCollapsible = () => {
  const context = useContext(CollapsibleContext);
  if (!context) {
    throw new Error('useCollapsible must be used within a Collapsible');
  }
  return context;
};

// Main Collapsible component
interface CollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
};

// CollapsibleTrigger component
interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

export const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({
  children,
  className,
  onClick,
  ...props
}) => {
  const { open, onOpenChange } = useCollapsible();
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(!open);
    onClick?.(event);
  };

  return (
    <button
      className={cn(className)}
      onClick={handleClick}
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      {...props}
    >
      {children}
    </button>
  );
};

// CollapsibleContent component
interface CollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CollapsibleContent: React.FC<CollapsibleContentProps> = ({
  children,
  className
}) => {
  const { open } = useCollapsible();

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(className)}
      data-state={open ? 'open' : 'closed'}
    >
      {children}
    </div>
  );
};

// Legacy Collapsible component (for backward compatibility)
interface LegacyCollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export const LegacyCollapsible: React.FC<LegacyCollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border border-border rounded-md", className)}>
      <button
        className="flex items-center justify-between w-full p-3 text-left bg-muted/50 hover:bg-muted rounded-t-md transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-sm">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>
      {isOpen && (
        <div className="p-3 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
};

// Default export
export default Collapsible;