import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import systemRoutes from './routes/system.routes';

/**
 * Self-registering backend manifest for System Diagnostics & Infrastructure (ADR-017).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'system',
  routes: [
    {
      prefix: '/system',
      router: systemRoutes,
    },
  ],
};
