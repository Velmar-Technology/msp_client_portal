import { Boxes } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { assetsRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Assets & Consumables domain.
 * Automatically discovered by `featureRegistry.ts` for router and sidebar integration.
 */
export const featureManifest: FeatureManifest = {
  id: 'assets',
  routes: assetsRoutes,
  navItems: [
    {
      to: '/assets',
      icon: Boxes,
      labelKey: 'assets',
      group: 'operations',
      order: 25,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: 'assets:read',
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
      featureGatedRoles: ['CLIENT'],
    },
  ],
};
