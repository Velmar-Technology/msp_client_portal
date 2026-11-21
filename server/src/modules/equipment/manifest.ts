import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import equipmentRoutes from './routes/equipment.routes';

/**
 * Self-registering backend manifest for Workstations & Devices (ADR-017 / BL-205).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'equipment',
  routes: [
    {
      prefix: '/equipment',
      router: equipmentRoutes,
    },
    {
      prefix: '/workspaces/equipment',
      router: equipmentRoutes,
    },
  ],
};
