import { Activity } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { systemRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the System & API Status domain (ADR-017).
 */
export const featureManifest: FeatureManifest = {
  id: 'system',
  routes: systemRoutes,
  navItems: [
    {
      to: '/admin/api-status',
      icon: Activity,
      labelKey: 'apiStatus',
      group: 'management',
      order: 50,
      roles: ['ADMIN'],
      requiredPermission: 'system:read',
    },
  ],
};
