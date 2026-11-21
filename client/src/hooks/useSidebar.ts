import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import i18n from "i18next";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { subscriptionService, planService, type Plan, type Subscription } from "@/features/subscriptions";
import { mergeFeatureNavItems } from "@/routes/featureRegistry";
import type { NavKey } from "@shared/contracts";

export interface NavSubItem {
  to: string;
  labelKey: string;
  counterKey?: NavKey;
}

export interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  groupLabelKey?: string;
  order?: number;
  items?: NavSubItem[];
  requiredFeature?: string;
  counterKey?: NavKey;
}

const baseClientNavItems: NavItem[] = [];
const baseTechNavItems: NavItem[] = [];
const baseAdminNavItems: NavItem[] = [];

const clientNavItems: NavItem[] = mergeFeatureNavItems(baseClientNavItems, "CLIENT");
const techNavItems: NavItem[] = mergeFeatureNavItems(baseTechNavItems, "TECHNICIAN");
const adminNavItems: NavItem[] = mergeFeatureNavItems(baseAdminNavItems, "ADMIN");

export function useSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeSubscriptions, setActiveSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingSub, setLoadingSub] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (user?.role !== "CLIENT") {
      Promise.resolve().then(() => {
        if (isMounted) {
          setActiveSubscriptions([]);
          setPlans([]);
        }
      });
      return;
    }
    async function loadActiveSubs() {
      setLoadingSub(true);
      try {
        const [subs, planList] = await Promise.all([
          subscriptionService.getAll(),
          planService.getAll({ limit: 100 }),
        ]);
        if (isMounted) {
          const active = subs.filter((sub) => sub.status === "ACTIVE" || sub.status === "EXPIRING");
          setActiveSubscriptions(active);
          setPlans(planList);
        }
      } catch (err) {
        console.error("Failed to load active subscriptions for sidebar", err);
      } finally {
        if (isMounted) setLoadingSub(false);
      }
    }
    loadActiveSubs();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const currentLanguage = i18n.language;
  const planNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const lang = currentLanguage?.startsWith("es") ? "es_DO" : "en_US";
    for (const plan of plans) {
      const name = plan.name;
      if (typeof name === "string") {
        map.set(plan.id, name);
      } else if (name && typeof name === "object") {
        map.set(plan.id, name[lang] || name["en_US"] || Object.values(name)[0] || plan.id);
      } else {
        map.set(plan.id, plan.id);
      }
    }
    return map;
  }, [plans, currentLanguage]);

  const isPublicLegalPage = location.pathname === "/terms" || location.pathname === "/privacy";

  const navItems = useMemo(() => {
    if (!user || isPublicLegalPage) return [];
    if (Array.isArray(user.permissions)) {
      if (user.role === "ADMIN") {
        return mergeFeatureNavItems(baseAdminNavItems, "ADMIN", undefined, user.permissions);
      }
      if (user.role === "TECHNICIAN") {
        return mergeFeatureNavItems(baseTechNavItems, "TECHNICIAN", undefined, user.permissions);
      }
      return mergeFeatureNavItems(baseClientNavItems, "CLIENT", undefined, user.permissions);
    }
    if (user.role === "ADMIN") return adminNavItems;
    if (user.role === "TECHNICIAN") return techNavItems;
    return clientNavItems;
  }, [user, isPublicLegalPage]);

  const checkIsActive = useCallback(
    (to: string) => {
      if (to === "/dashboard" || to === "/tech/dashboard" || to === "/admin/dashboard") {
        return location.pathname === to;
      }
      return location.pathname.startsWith(to);
    },
    [location.pathname]
  );

  const checkIsGroupActive = useCallback(
    (items?: NavSubItem[]) => {
      if (!items) return false;
      return items.some((sub) => location.pathname.startsWith(sub.to));
    },
    [location.pathname]
  );

  const { isFeatureLocked } = useEntitlements();

  return {
    user,
    location,
    activeSubscriptions,
    activeSubscription: activeSubscriptions[0] ?? null,
    planNameMap,
    loadingSub,
    navItems,
    checkIsActive,
    checkIsGroupActive,
    isFeatureLocked,
  };
}
