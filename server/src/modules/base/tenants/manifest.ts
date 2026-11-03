import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import { tenantRoutes } from '@modules/auth';

/**
 * Self-registering manifest for Base Tenants (ADR-017 / ADR-018).
 * Mounts under parent 'base' at '/base/tenants'.
 * Declarative security rules and default role bindings declared in `./security.csv`.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'base.tenants',
  parentId: 'base',
  routes: [
    { prefix: '/tenants', router: tenantRoutes },
  ],
};
