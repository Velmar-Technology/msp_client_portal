import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import { userRoutes } from '@modules/auth';

/**
 * Self-registering manifest for Base Users (ADR-017 / ADR-018).
 * Mounts under parent 'base' at '/base/users'.
 * Declarative security rules and default role bindings declared in `./security.csv`.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'base.users',
  parentId: 'base',
  routes: [
    { prefix: '/users', router: userRoutes },
  ],
};
