import { KeyRound, Sparkles } from 'lucide-react';
import { FEATURE_CODES } from '@/constants/subscriptions';
import type { FeatureManifest } from '@/routes/featureRegistry';
import { settingsRoutes } from './routes';

/**
 * Self-registering Feature Manifest for the Vault & AI Settings extensions (ADR-017).
 */
export const featureManifest: FeatureManifest = {
  id: 'settings.extensions',
  routes: settingsRoutes,
  navItems: [
    {
      to: '/password-manager',
      icon: KeyRound,
      labelKey: 'passwordManager',
      group: 'operations',
      order: 40,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: 'settings:read',
      requiredFeature: FEATURE_CODES.PASSWORD_MANAGER,
    },
    {
      to: '/settings/ai',
      icon: Sparkles,
      labelKey: 'cafAiSettings',
      group: 'operations',
      order: 50,
      roles: ['CLIENT', 'ADMIN'],
      requiredPermission: 'settings:read',
      requiredFeature: FEATURE_CODES.CAF_EDUCATION_AGENT,
    },
  ],
};
