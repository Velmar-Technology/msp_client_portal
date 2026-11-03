import type { AppRouteObject } from '@/routes/types';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { RouteSuspenseWrapper, TablePageSkeleton } from '@/components/skeletons';
import { FEATURE_CODES } from '@/constants/subscriptions';

const AssetsPage = lazyWithRetry(() =>
  import('./pages/AssetsPage').then((m) => ({ default: m.AssetsPage }))
);

/**
 * Assets Domain Route Manifest (ADR-002 / ADR-003)
 */
export const assetsRoutes: AppRouteObject[] = [
  {
    path: '/assets',
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <AssetsPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t('nav.assets'), to: '/assets' }),
      allowedRoles: ['CLIENT', 'ADMIN', 'TECHNICIAN'],
      requiredFeature: FEATURE_CODES.ASSET_LIFECYCLE,
    },
  },
];
