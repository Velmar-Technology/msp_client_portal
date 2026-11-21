import { Receipt } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { billingRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Billing domain (ADR-017 / BL-401 / BL-701).
 */
export const featureManifest: FeatureManifest = {
  id: 'billing',
  routes: billingRoutes,
  navItems: [
    {
      to: '/billing',
      icon: Receipt,
      labelKey: 'billing',
      group: 'account',
      order: 90,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: 'invoices:read',
      counterKey: 'billing',
    },
  ],
};
