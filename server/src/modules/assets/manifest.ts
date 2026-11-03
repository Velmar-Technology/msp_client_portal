import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import assetRoutes from './routes/asset.routes';

/**
 * Self-registering backend manifest for the Assets & Consumables module (ADR-017 / BL-302).
 * Permissions and default role bindings are declared in `./security.csv`.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'assets',
  routes: [
    {
      prefix: '/assets',
      router: assetRoutes,
    },
  ],
};
