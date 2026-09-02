import React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized PageHeader shared component.
 * Provides consistent title hierarchy, optional badges, subtitles, and action slot across pages.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 mb-6',
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {badge && <div className="flex items-center">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:self-center shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
