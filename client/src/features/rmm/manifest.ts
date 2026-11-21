import { Calendar } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { rmmRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the RMM & Maintenance domain (ADR-017 / BL-103).
 */
export const featureManifest: FeatureManifest = {
  id: 'rmm',
  routes: rmmRoutes,
  navItems: [
    {
      to: '/maintenance',
      icon: Calendar,
      labelKey: 'maintenance',
      group: 'operations',
      order: 60,
      roles: ['CLIENT', 'TECHNICIAN', 'ADMIN'],
      requiredPermission: 'maintenance:read',
      requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT,
      counterKey: 'maintenance',
    },
  ],
};
