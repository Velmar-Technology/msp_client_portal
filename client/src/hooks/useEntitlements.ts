import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionService, planService, type Subscription, type Plan } from "@/features/subscriptions";
import { FEATURE_CODES, FEATURE_UPGRADE_TIER_MAP, expandFeatureBundles } from "@/constants/subscriptions";

export interface UseEntitlementsReturn {
  /** Checks if the current user or tenant has active access to a specific feature code */
  hasFeature: (featureCode?: string) => boolean;
  /** Checks if a specific feature code is locked for the current user */
  isFeatureLocked: (featureCode?: string) => boolean;
  /** Deduplicated array of active feature codes across all active subscriptions */
  activeFeatures: string[];
  /** Returns the minimum recommended upgrade plan ID for a feature */
  getRequiredTierForFeature: (featureCode?: string) => string;
  /** True if subscription entitlements are resolving */
  isLoading: boolean;
  /** True if tenant possesses at least one active or expiring subscription */
  hasActiveSubscription: boolean;
  /** Active subscriptions list */
  activeSubscriptions: Subscription[];
}

/**
 * Hook resolving subscription-based feature entitlements and plan capabilities.
 *
 * Operational rules:
 * - ADMIN and TECHNICIAN roles bypass feature gates unconditionally (all features unlocked).
 * - CLIENT users must hold an ACTIVE or EXPIRING subscription whose plan includes the feature.
 * - Multi-subscription tenants receive the union of all active subscription features.
 */
export function useEntitlements(): UseEntitlementsReturn {
  const { user } = useAuth();
  const isClient = user?.role === "CLIENT";

  const { data: subscriptions = [], isLoading: isLoadingSubs } = useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: () => subscriptionService.getAll(),
    enabled: isClient && !!user,
    staleTime: 60_000,
  });

  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["plans", "all"],
    queryFn: () => planService.getAll({ limit: 100 }),
    enabled: isClient && !!user,
    staleTime: 300_000,
  });

  const activeSubscriptions = useMemo(() => {
    if (!isClient) return [];
    return subscriptions.filter(
      (sub) => sub.status === "ACTIVE" || sub.status === "EXPIRING"
    );
  }, [subscriptions, isClient]);

  const activeFeatures = useMemo(() => {
    if (!isClient) return Object.values(FEATURE_CODES);
    if (activeSubscriptions.length === 0) return [];

    const planMap = new Map<string, Plan>();
    for (const p of plans) {
      planMap.set(p.id, p);
    }

    const featureSet = new Set<string>();

    for (const sub of activeSubscriptions) {
      const plan = planMap.get(sub.plan);
      if (!plan || !Array.isArray(plan.features)) continue;

      for (const feat of plan.features) {
        if (typeof feat === "string") {
          featureSet.add(feat);
        } else if (typeof feat === "object" && feat !== null) {
          const item = feat as { code?: string; included?: boolean };
          if (item.included !== false && item.code) {
            featureSet.add(item.code);
          }
        }
      }
    }

    return expandFeatureBundles(featureSet);
  }, [activeSubscriptions, plans, isClient]);

  const hasFeature = useCallback(
    (featureCode?: string): boolean => {
      if (!featureCode) return true;
      if (!isClient) return true; // Admin & Tech bypass
      return activeFeatures.includes(featureCode);
    },
    [isClient, activeFeatures]
  );

  const isFeatureLocked = useCallback(
    (featureCode?: string): boolean => {
      if (!featureCode) return false;
      if (!isClient) return false; // Admin & Tech bypass
      return !activeFeatures.includes(featureCode);
    },
    [isClient, activeFeatures]
  );

  const getRequiredTierForFeature = useCallback((featureCode?: string): string => {
    if (!featureCode) return "PL-001";
    return FEATURE_UPGRADE_TIER_MAP[featureCode] || "PL-003";
  }, []);

  return {
    hasFeature,
    isFeatureLocked,
    activeFeatures,
    getRequiredTierForFeature,
    isLoading: isClient ? (isLoadingSubs || isLoadingPlans) : false,
    hasActiveSubscription: activeSubscriptions.length > 0,
    activeSubscriptions,
  };
}
