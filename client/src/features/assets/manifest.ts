import { Boxes } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { assetsRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the IT Assets domain (ADR-017).
 * Consolidated single-page view with in-page tabs for IT Assets and Consumables (ADR-016).
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
      roles: ['CLIENT', 'TECHNICIAN', 'ADMIN'],
      requiredPermission: 'assets:read',
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
      featureGatedRoles: ['CLIENT'],
    },
  ],
};
