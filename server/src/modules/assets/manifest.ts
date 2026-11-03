import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import assetRoutes from './routes/asset.routes';

/**
 * Self-registering backend manifest for the Assets & Consumables module.
 * Automatically discovered for API Gateway routing and RBAC permission seeding.
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
    admin: ['assets:read', 'assets:manage'],
    technician: ['assets:read', 'assets:manage'],
    client: ['assets:read'],
  },
};
