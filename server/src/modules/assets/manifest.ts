import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import assetRoutes from './routes/asset.routes';

/**
 * Self-registering backend manifest for the Assets & Consumables module (ADR-017 / BL-302).
 * Automatically discovered for API Gateway routing and Dynamic RBAC permission catalog sync.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'assets',
  routes: [
    {
      prefix: '/assets',
      router: assetRoutes,
    },
  ],
  permissions: {
    admin: [
      'assets:read',
      'assets:create',
      'assets:update',
      'assets:delete',
      'assets:manage',
    ],
    technician: ['assets:read', 'assets:create', 'assets:update'],
    client: ['assets:read'],
  },
};
