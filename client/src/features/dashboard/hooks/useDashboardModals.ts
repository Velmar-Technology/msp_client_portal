import { useState } from 'react';

/**
 * ADR-002: Ephemeral UI modal open/close state.
 */
export function useDashboardModals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return {
    isCreateOpen,
    openCreate: () => setIsCreateOpen(true),
    closeCreate: () => setIsCreateOpen(false),
  };
}
