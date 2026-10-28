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
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5 mb-6 transition-colors',
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl font-sans">
            {title}
          </h1>
          {badge && <div className="flex items-center">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 sm:self-center shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
