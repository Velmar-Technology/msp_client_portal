import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import { authRoutes, authzRoutes } from '@modules/auth';

/**
 * Self-registering manifest for Base Auth (ADR-017 / ADR-018).
 * Mounts under parent 'base' at '/base/auth' and '/base/authz'.
 * Declarative security rules and default role bindings declared in `./security.csv`.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'base.auth',
  parentId: 'base',
  routes: [
    { prefix: '/auth', router: authRoutes },
    { prefix: '/authz', router: authzRoutes },
  ],
};
