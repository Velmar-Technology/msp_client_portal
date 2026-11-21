import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import notificationRoutes from './routes/notification.routes';
import notificationPreferenceRoutes from './routes/notificationPreference.routes';

/**
 * Self-registering backend manifest for Notifications & Alerts (ADR-017).
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'notifications',
  routes: [
    {
      prefix: '/notifications',
      router: notificationRoutes,
    },
    {
      prefix: '/notification-preferences',
      router: notificationPreferenceRoutes,
    },
  ],
};
