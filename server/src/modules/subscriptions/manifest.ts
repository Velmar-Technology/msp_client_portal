import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import subscriptionRoutes from './routes/subscription.routes';
import planRoutes from './routes/plan.routes';

/**
 * Self-registering backend manifest for Subscriptions & Plans (ADR-017 / BL-204 / BL-402).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'subscriptions',
  routes: [
    {
      prefix: '/subscriptions',
      router: subscriptionRoutes,
    },
    {
      prefix: '/plans',
      router: planRoutes,
    },
    {
      prefix: '/workspaces/subscriptions',
      router: subscriptionRoutes,
    },
  ],
};
