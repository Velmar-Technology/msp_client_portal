import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import kbRoutes from './routes/kb.routes';

/**
 * Self-registering backend manifest for Helpdesk Knowledge Base (ADR-017 / BL-302).
 * Mounts under parent 'helpdesk' at '/helpdesk/kb'.
 * Permissions and default role bindings are declared in `./security.csv`.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk.kb',
  parentId: 'helpdesk',
  routes: [
    {
      prefix: '/kb',
      router: kbRoutes,
    },
  ],
};
