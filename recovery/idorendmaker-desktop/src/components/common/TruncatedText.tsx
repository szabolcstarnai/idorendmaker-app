import React from 'react';
import { cn } from '../../lib/utils';

interface TruncatedTextProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  maxLength?: number;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
  children,
  className,
  as: Component = 'span',
  maxLength
}) => {
  const text = typeof children === 'string' ? children : String(children);
  const truncatedText = maxLength && text.length > maxLength
    ? `${text.substring(0, maxLength)}...`
    : text;

  return (
    <Component
      className={cn("truncate", className)}
      title={text}
    >
      {truncatedText}
    </Component>
  );
};

export default TruncatedText;