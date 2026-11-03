import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import ticketRoutes from './routes/ticket.routes';

/**
 * Self-registering backend manifest for Helpdesk Tickets (ADR-017 / BL-302).
 * Mounts under parent 'helpdesk' at '/helpdesk/tickets'.
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
  permissions: {
    admin: [
      'tickets:read',
      'tickets:create',
      'tickets:manage',
      'helpdesk:tickets:read',
      'helpdesk:tickets:create',
      'helpdesk:tickets:update',
      'helpdesk:tickets:delete',
      'helpdesk:tickets:manage',
    ],
    technician: [
      'tickets:read',
      'tickets:manage',
      'helpdesk:tickets:read',
      'helpdesk:tickets:create',
      'helpdesk:tickets:update',
    ],
    client: [
      'tickets:read',
      'tickets:create',
      'helpdesk:tickets:read',
      'helpdesk:tickets:create',
    ],
  },
};
