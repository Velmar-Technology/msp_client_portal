import type { ReactNode } from "react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { FeatureLockedPreview } from "./FeatureLockedPreview";
import { RouteLoadingSpinner } from "@/protected-routes";
import type { FeatureCode } from "@/constants/subscriptions";

export interface FeatureRouteGuardProps {
  requiredFeature: FeatureCode;
  children: ReactNode;
}

/**
 * Route guard component wrapping page views that require specific active subscription features.
 *
 * Operational rules:
 * - If user is ADMIN or TECHNICIAN, immediately renders children.
 * - If user is CLIENT and feature is locked (not included in active subscriptions),
 *   renders FeatureLockedPreview prompting the user to upgrade.
 * - Otherwise renders children.
 */
export function FeatureRouteGuard({ requiredFeature, children }: FeatureRouteGuardProps) {
  const { isFeatureLocked, isLoading } = useEntitlements();

  if (isLoading) {
    return <RouteLoadingSpinner />;
  }

  if (isFeatureLocked(requiredFeature)) {
    return <FeatureLockedPreview requiredFeature={requiredFeature} />;
  }

  return <>{children}</>;
}
