import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized TableToolbar component.
 * Encapsulates search inputs, filter dropdowns, and table action buttons.
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4',
        className
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        {onSearchChange && (
          <Input
            placeholder={searchPlaceholder}
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 w-full sm:w-64 bg-background text-foreground"
          />
        )}
        {filters}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
