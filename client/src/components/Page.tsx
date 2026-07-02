import * as React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './layout/Breadcrumbs';
import { Skeleton } from './ui/skeleton';

export interface PageProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
  isLoading?: boolean;
}

export function Page({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  children,
  className,
  isLoading,
  ...props
}: PageProps) {
  return (
    <div
      className={cn('animate-fade-in max-w-7xl mx-auto w-full text-zinc-900 dark:text-zinc-50', className)}
      {...props}
    >
      {showBreadcrumbs && <Breadcrumbs className="mb-4 text-zinc-500 dark:text-zinc-400" />}
      {(title || subtitle || actions) && (
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {(title || subtitle) && (
            <div className="space-y-0.5">
              {title && (
                <h1
                  className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 animate-fade-in"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-550 dark:text-zinc-400 animate-fade-in">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {actions ? (
            isLoading ? (
              <Skeleton className="animate-fade-in shrink-0 w-32 h-8.5 rounded-md" />
            ) : (
              <div className="flex items-center gap-2 animate-fade-in shrink-0">
                {actions}
              </div>
            )
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}
