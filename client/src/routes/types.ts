import type { RouteObject } from 'react-router-dom';
import type { CrumbResolver } from '@/components/layout/routeCrumbs';
import type { FeatureCode } from '@/constants/subscriptions';

/**
 * Metadata attached to route matches via route.handle.
 */
export interface AppRouteHandle {
  /**
   * Breadcrumb resolver function for topbar navigation.
   */
  crumb?: CrumbResolver;
  /**
   * Allowed user roles for this route (e.g. ['ADMIN', 'TECHNICIAN']).
   */
  allowedRoles?: string[];
  /**
   * Subscription feature code required to view this route.
   */
  requiredFeature?: FeatureCode;
  /**
   * Optional static or dynamic title key for document.title.
   */
  titleKey?: string;
  /**
   * Optional flag declaring public unauthenticated access.
   */
  isPublic?: boolean;
}

/**
 * Standard typed application route object for React Router v7 Data Mode.
 */
export type AppRouteObject = Omit<RouteObject, 'handle' | 'children'> & {
  handle?: AppRouteHandle;
  children?: AppRouteObject[];
};

/**
 * Standard interface for feature route manifest modules.
 */
export interface FeatureRouteManifest {
  routes: AppRouteObject[];
}
