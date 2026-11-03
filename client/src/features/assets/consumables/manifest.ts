import { Package } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { consumableRoutes } from './routes';

/**
 * Self-registering hierarchical child feature manifest for IT Consumables (ADR-017).
 * Automatically nests under parent 'assets' ('/assets') in the sidebar navigation
 * and routes under '/assets/consumables'.
 */
export const featureManifest: FeatureManifest = {
  id: 'assets.consumables',
  parentId: 'assets',
  routes: consumableRoutes,
  navItems: [
    {
      to: '/assets/consumables',
      parentTo: '/assets',
      icon: Package,
      labelKey: 'consumables',
      group: 'operations',
      order: 20,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: ['assets:consumables:read', 'assets:read'],
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
      featureGatedRoles: ['CLIENT'],
    },
  ],
};
