import { Laptop, Download } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { equipmentRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Equipment & Devices domain (ADR-017 / BL-205).
 */
export const featureManifest: FeatureManifest = {
  id: 'equipment',
  routes: equipmentRoutes,
  navItems: [
    {
      to: '/devices',
      icon: Laptop,
      labelKey: 'devices',
      group: 'operations',
      order: 20,
      roles: ['CLIENT', 'TECHNICIAN', 'ADMIN'],
      requiredPermission: 'devices:read',
      requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT,
      counterKey: 'devices',
    },
    {
      to: '/resources',
      icon: Download,
      labelKey: 'resources',
      group: 'operations',
      order: 30,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: 'devices:read',
      requiredFeature: FEATURE_CODES.CLOUD_STORAGE,
    },
  ],
};
