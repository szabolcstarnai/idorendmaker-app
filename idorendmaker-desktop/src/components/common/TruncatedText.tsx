import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

interface TruncatedTextProps {
  children: string;
  className?: string;
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  title?: string; // Allow manual override of tooltip content
}

const TruncatedText: React.FC<TruncatedTextProps> = ({ 
  children, 
  className, 
  as: Component = 'span',
  title
}) => {
  if (!children) {
    return <Component className={className}></Component>;
  }

  const tooltipContent = title || children;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Component 
            className={cn("truncate", className)}
          >
            {children}
          </Component>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TruncatedText;