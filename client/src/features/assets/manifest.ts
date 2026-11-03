import { Boxes } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { assetsRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the IT Assets domain (ADR-017).
 * Automatically discovered by `featureRegistry.ts` for router and sidebar integration.
 * Houses child sub-modules such as `assets.consumables`.
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
      items: [
        {
          to: '/assets',
          labelKey: 'itAssets',
          order: 10,
          requiredPermission: 'assets:read',
        },
      ],
    },
  ],
};
