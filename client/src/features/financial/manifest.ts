import { Landmark } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { financialRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Financial & P&L domain (ADR-017 / BL-801 / BL-802).
 */
export const featureManifest: FeatureManifest = {
  id: 'financial',
  routes: financialRoutes,
  navItems: [
    {
      to: '/financial',
      icon: Landmark,
      labelKey: 'financial',
      group: 'management',
      order: 30,
      roles: ['ADMIN'],
      requiredPermission: 'financial:read',
    },
  ],
};
