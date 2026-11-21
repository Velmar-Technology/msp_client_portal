import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import rmmRoutes from './routes/rmm.routes';
import alertRoutes from './routes/alert.routes';
import maintenanceRoutes from './routes/maintenance.routes';

/**
 * Self-registering backend manifest for RMM & Endpoint Telemetry (ADR-017 / BL-103).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'rmm',
  routes: [
    {
      prefix: '/rmm',
      router: rmmRoutes,
    },
    {
      prefix: '/alerts',
      router: alertRoutes,
    },
    {
      prefix: '/maintenance',
      router: maintenanceRoutes,
    },
  ],
};
