import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import crmRoutes from './routes/crm.routes';

/**
 * Self-registering backend manifest for the CRM domain (ADR-017 / BL-302 / BL-501).
 * Permissions and default role bindings are declared in `./security.csv`.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'crm',
  routes: [
    {
      prefix: '/crm',
      router: crmRoutes,
    },
  ],
};
