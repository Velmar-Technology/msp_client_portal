import * as React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs } from './layout/Breadcrumbs';

export interface PageProps extends Omit<React.ComponentPropsWithoutRef<'div'>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export function Page({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  children,
  className,
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
          {actions && (
            <div className="flex items-center gap-3 animate-fade-in shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
