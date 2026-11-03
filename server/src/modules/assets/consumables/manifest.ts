import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import consumableRoutes from './routes/consumable.routes';

/**
 * Self-registering backend hierarchical child manifest for Consumables & Supplies (ADR-017 / BL-302).
 * Automatically mounts under parent 'assets' at '/assets/consumables'.
 * Dynamic RBAC capabilities and role defaults are declared in colocated `./security.csv`.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'assets.consumables',
  parentId: 'assets',
  routes: [
    {
      prefix: '/consumables',
      router: consumableRoutes,
    },
  ],
};
