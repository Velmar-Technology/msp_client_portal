import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import ticketRoutes from './routes/ticket.routes';

/**
 * Self-registering backend manifest for Helpdesk Tickets (ADR-017 / BL-302).
 * Mounts under parent 'helpdesk' at '/helpdesk/tickets'.
 * Permissions and default role bindings are declared in `./security.csv`.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk.tickets',
  parentId: 'helpdesk',
  routes: [
    {
      prefix: '/tickets',
      router: ticketRoutes,
    },
  ],
};
