import { LayoutDashboard, Shield } from 'lucide-react';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { dashboardRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Dashboard domain (ADR-017).
 */
export const featureManifest: FeatureManifest = {
  id: 'dashboard',
  routes: dashboardRoutes,
  navItems: [
    {
      to: '/dashboard',
      icon: LayoutDashboard,
      labelKey: 'dashboard',
      group: 'operations',
      order: 10,
      roles: ['CLIENT'],
    },
    {
      to: '/tech/dashboard',
      icon: LayoutDashboard,
      labelKey: 'dashboard',
      group: 'operations',
      order: 10,
      roles: ['TECHNICIAN'],
    },
    {
      to: '/dashboard',
      icon: Shield,
      labelKey: 'adminDashboard',
      group: 'management',
      order: 10,
      roles: ['ADMIN'],
    },
  ],
};
