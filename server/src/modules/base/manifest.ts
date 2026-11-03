import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';

/**
 * Self-registering parent container manifest for the Base domain (ADR-017 / ADR-018).
 * Houses common core sub-modules (`base.auth`, `base.users`, `base.tenants`) and establishes
 * the `/base` API prefix hierarchy while providing reusable mixins, repositories, and event bus.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'base',
  basePrefix: '/base',
};
