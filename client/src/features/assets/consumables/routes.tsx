import type { AppRouteObject } from '@/routes/types';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { RouteSuspenseWrapper, TablePageSkeleton } from '@/components/skeletons';
import { FEATURE_CODES } from '@/constants/subscriptions';

const ConsumablesPage = lazyWithRetry(() =>
  import('./pages/ConsumablesPage').then((m) => ({ default: m.ConsumablesPage }))
);

/**
 * Consumables Sub-Feature Route Manifest (ADR-017)
 */
export const consumableRoutes: AppRouteObject[] = [
  {
    path: 'consumables',
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <ConsumablesPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t('nav.consumables'), to: '/assets/consumables' }),
      requiredPermission: ['assets:consumables:read', 'assets:read'],
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
    },
  },
];
