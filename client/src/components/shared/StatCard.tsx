import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

/**
 * Standardized StatCard/DataCard component.
 * Incorporates subtle group hover transitions and semantic design tokens.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className,
}) => {
  return (
    <Card
      className={cn(
        'group bg-card text-card-foreground p-3.5 shadow-xs border-border transition-all duration-200 hover:border-border/80 hover:shadow-sm',
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className="rounded-md bg-muted p-1.5 text-muted-foreground transition-colors group-hover:bg-muted/80 shrink-0">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {value}
          </h2>
          {trend && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.value}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-[9px] text-muted-foreground font-mono">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
