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
      className={cn('animate-fade-in max-w-7xl mx-auto', className)}
      {...props}
    >
      {showBreadcrumbs && <Breadcrumbs className="mb-6" />}
      {(title || subtitle || actions) && (
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {(title || subtitle) && (
            <div>
              {title && (
                <h1
                  className="text-h1 text-primary animate-fade-in"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-body-md text-on-surface-variant opacity-80 mt-1 animate-fade-in">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {actions ? isLoading ? (<Skeleton className={cn('animate-fade-in shrink-0 w-36 h-10')} />) : (
            <div className="flex items-center gap-3 animate-fade-in shrink-0">
              {actions}
            </div>
          ) : (null)}
        </div>
      )}
      {children}
    </div>
  );
}
