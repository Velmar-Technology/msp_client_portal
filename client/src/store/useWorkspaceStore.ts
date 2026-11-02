import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActiveTenant {
  id: string;
  name: string;
  subdomain?: string | null;
  account_status?: string;
}

export interface WorkspaceState {
  activeTenant: ActiveTenant | null;
  setActiveTenant: (tenant: ActiveTenant | null) => void;
  resetToHome: () => void;
}

/**
 * Ephemeral client-side workspace state managing multi-tenant context switching for Admins & Techs.
 * Persists active tenant override across page refreshes.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeTenant: null,
      setActiveTenant: (tenant) => set({ activeTenant: tenant }),
      resetToHome: () => set({ activeTenant: null }),
    }),
    {
      name: 'msp_active_workspace',
    }
  )
);
