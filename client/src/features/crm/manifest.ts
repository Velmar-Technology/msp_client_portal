import { Target } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { crmRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the CRM domain (ADR-017 / BL-501).
 * Declares admin pipeline routing and sidebar navigation entry with dynamic RBAC.
 */
export const featureManifest: FeatureManifest = {
  id: 'crm',
  routes: crmRoutes,
  navItems: [
    {
      to: '/crm',
      icon: Target,
      labelKey: 'crm',
      group: 'operations',
      order: 20,
      roles: ['ADMIN'],
      requiredPermission: 'crm:leads:read',
      counterKey: 'crm',
    },
  ],
};
