import { Package } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { subscriptionRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Subscriptions & Plans domain (ADR-017 / BL-204).
 */
export const featureManifest: FeatureManifest = {
  id: 'subscriptions',
  routes: subscriptionRoutes,
  navItems: [
    {
      to: '/plans',
      icon: Package,
      labelKey: 'plans',
      group: 'account',
      order: 80,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: 'plans:read',
    },
  ],
};
