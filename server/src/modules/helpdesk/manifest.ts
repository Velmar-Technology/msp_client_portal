import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';

/**
 * Self-registering backend container manifest for the Helpdesk parent domain (ADR-017).
 * Child sub-modules (`helpdesk.tickets`, `helpdesk.kb`) inherit `basePrefix: '/helpdesk'`
 * and register their own atomic RBAC permissions (`BL-302`).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'helpdesk',
  basePrefix: '/helpdesk',
};
