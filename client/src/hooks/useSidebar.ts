import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import i18n from "i18next";
import {
  LayoutDashboard,
  User,
  Users,
  Shield,
  Settings,
  Laptop,
  Landmark,
  Calendar,
  Download,
  Activity,
  Target,
  KeyRound,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { subscriptionService, planService, type Plan, type Subscription } from "@/features/subscriptions";
import { FEATURE_CODES } from "@/constants/subscriptions";
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

const baseClientNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", groupLabelKey: "sidebar.groups.operations", order: 10 },
  { to: "/devices", icon: Laptop, labelKey: "devices", requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT, counterKey: "devices", order: 20 },
  { to: "/resources", icon: Download, labelKey: "resources", requiredFeature: FEATURE_CODES.CLOUD_STORAGE, order: 30 },
  { to: "/password-manager", icon: KeyRound, labelKey: "passwordManager", requiredFeature: FEATURE_CODES.PASSWORD_MANAGER, order: 40 },
  { to: "/settings/ai", icon: Sparkles, labelKey: "cafAiSettings", requiredFeature: FEATURE_CODES.CAF_EDUCATION_AGENT, order: 50 },
  { to: "/maintenance", icon: Calendar, labelKey: "maintenance", requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT, counterKey: "maintenance", order: 60 },
  {
    to: "/account-group",
    icon: User,
    labelKey: "account",
    groupLabelKey: "sidebar.groups.account",
    order: 100,
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
      { to: "/plans", labelKey: "plans" },
      { to: "/billing", labelKey: "billing", counterKey: "billing" },
    ],
  },
];

const baseTechNavItems: NavItem[] = [
  { to: "/tech/dashboard", icon: LayoutDashboard, labelKey: "dashboard", groupLabelKey: "sidebar.groups.operations", order: 10 },
  { to: "/maintenance", icon: Calendar, labelKey: "maintenance", counterKey: "maintenance", order: 60 },
  {
    to: "/account-group",
    icon: User,
    labelKey: "account",
    groupLabelKey: "sidebar.groups.account",
    order: 100,
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
    ],
  },
];

const baseAdminNavItems: NavItem[] = [
  { to: "/dashboard", icon: Shield, labelKey: "adminDashboard", groupLabelKey: "sidebar.groups.management", order: 10 },
  { to: "/crm", icon: Target, labelKey: "crm", counterKey: "crm", order: 20 },
  { to: "/financial", icon: Landmark, labelKey: "financial", order: 30 },
  { to: "/admin/users", icon: Users, labelKey: "userManagement", order: 40 },
  { to: "/admin/api-status", icon: Activity, labelKey: "apiStatus", order: 50 },
  { to: "/devices", icon: Laptop, labelKey: "devices", groupLabelKey: "sidebar.groups.operations", counterKey: "devices", order: 20 },
  { to: "/resources", icon: Download, labelKey: "resources", order: 30 },
  { to: "/password-manager", icon: KeyRound, labelKey: "passwordManager", order: 40 },
  { to: "/settings/ai", icon: Sparkles, labelKey: "cafAiSettings", order: 50 },
  { to: "/maintenance", icon: Calendar, labelKey: "maintenance", counterKey: "maintenance", order: 60 },
  {
    to: "/settings-group",
    icon: Settings,
    labelKey: "settings",
    groupLabelKey: "sidebar.groups.account",
    order: 100,
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
      { to: "/plans", labelKey: "plans" },
      { to: "/billing", labelKey: "billing", counterKey: "billing" },
    ],
  },
];

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
