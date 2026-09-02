import React from 'react';
import { cn } from '@/lib/utils';

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized ModalFooter component for Dialog/Drawer footers.
 * Guarantees proper border separation and background tokens across modals.
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-border pt-4 mt-6 bg-card',
        className
      )}
    >
      {children}
    </div>
  );
};
