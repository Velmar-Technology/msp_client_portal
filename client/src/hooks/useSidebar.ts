import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import i18n from "i18next";
import {
  LayoutDashboard,
  Ticket,
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
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscriptionService } from "@/services/subscriptionService";
import { planService, type Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";

export interface NavSubItem {
  to: string;
  labelKey: string;
}

export interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  groupLabelKey?: string;
  items?: NavSubItem[];
}

const clientNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", groupLabelKey: "sidebar.groups.operations" },
  { to: "/devices", icon: Laptop, labelKey: "devices" },
  { to: "/resources", icon: Download, labelKey: "resources" },
  { to: "/maintenance", icon: Calendar, labelKey: "maintenance" },
  { to: "/tickets", icon: Ticket, labelKey: "myTickets" },
  {
    to: "/account-group",
    icon: User,
    labelKey: "account",
    groupLabelKey: "sidebar.groups.account",
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
      { to: "/plans", labelKey: "plans" },
      { to: "/billing", labelKey: "billing" },
    ],
  },
];

const techNavItems: NavItem[] = [
  { to: "/tech/dashboard", icon: LayoutDashboard, labelKey: "dashboard", groupLabelKey: "sidebar.groups.operations" },
  { to: "/maintenance", icon: Calendar, labelKey: "maintenance" },
  { to: "/tickets", icon: Ticket, labelKey: "myTickets" },
  {
    to: "/account-group",
    icon: User,
    labelKey: "account",
    groupLabelKey: "sidebar.groups.account",
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
    ],
  },
];

const adminNavItems: NavItem[] = [
  { to: "/dashboard", icon: Shield, labelKey: "adminDashboard", groupLabelKey: "sidebar.groups.management" },
  { to: "/crm", icon: Target, labelKey: "crm" },
  { to: "/financial", icon: Landmark, labelKey: "financial" },
  { to: "/admin/users", icon: Users, labelKey: "userManagement" },
  { to: "/admin/api-status", icon: Activity, labelKey: "apiStatus" },
  { to: "/devices", icon: Laptop, labelKey: "devices", groupLabelKey: "sidebar.groups.operations" },
  { to: "/resources", icon: Download, labelKey: "resources" },
  { to: "/maintenance", icon: Calendar, labelKey: "maintenance" },
  { to: "/tickets", icon: Ticket, labelKey: "allTickets" },
  {
    to: "/settings-group",
    icon: Settings,
    labelKey: "settings",
    groupLabelKey: "sidebar.groups.account",
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
      { to: "/plans", labelKey: "plans" },
      { to: "/billing", labelKey: "billing" },
    ],
  },
];

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

  const planNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const lang = i18n.language?.startsWith("es") ? "es_DO" : "en_US";
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
  }, [plans, i18n.language]);

  const isPublicLegalPage = location.pathname === "/terms" || location.pathname === "/privacy";

  const navItems = useMemo(() => {
    if (!user || isPublicLegalPage) return [];
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
  };
}
