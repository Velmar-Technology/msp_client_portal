import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import kbRoutes from './routes/kb.routes';

/**
 * Self-registering backend manifest for Helpdesk Knowledge Base (ADR-017 / BL-302).
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
  permissions: {
    admin: [
      'helpdesk:kb:read',
      'helpdesk:kb:create',
      'helpdesk:kb:update',
      'helpdesk:kb:delete',
    ],
    technician: ['helpdesk:kb:read', 'helpdesk:kb:create', 'helpdesk:kb:update'],
    client: ['helpdesk:kb:read'],
  },
};
