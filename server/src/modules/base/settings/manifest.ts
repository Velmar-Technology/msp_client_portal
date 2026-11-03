import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import settingsRoutes from './routes/settings.routes';

/**
 * Self-registering manifest for Base Settings (ADR-017 / ADR-019).
 * Mounts under parent 'base' at '/base/settings'.
 * Declarative security rules declared in `./security.csv`.
 *
 * @see ADR-017
 * @see ADR-019
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'base.settings',
  parentId: 'base',
  routes: [
    {
      prefix: '/settings',
      router: settingsRoutes,
    },
  ],
};
