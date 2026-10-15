import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Standardized EmptyState component.
 * Uses semantic theme tokens for empty list/table displays across the portal.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-10 text-center animate-in fade-in-50 transition-colors',
        className
      )}
    >
      {icon && (
        <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground mb-4 shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground/80 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm" className="mt-4.5 rounded-lg">
          {action.label}
        </Button>
      )}
    </div>
  );
};
