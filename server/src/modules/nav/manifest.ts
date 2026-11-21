import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import navRoutes from './routes/nav.routes';

/**
 * Self-registering backend manifest for Navigation & Cross-Device Counters (ADR-013 / ADR-017).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'nav',
  routes: [
    {
      prefix: '/nav',
      router: navRoutes,
    },
  ],
};
