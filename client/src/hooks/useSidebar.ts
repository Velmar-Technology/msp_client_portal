import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  User,
  Users,
  Shield,
  Settings,
  Laptop,
  Landmark,
} from "lucide-react";
import { useAuth } from "./useAuth";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";

export interface NavSubItem {
  to: string;
  labelKey: string;
}

export interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  items?: NavSubItem[];
}

const clientNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { to: "/financial", icon: Landmark, labelKey: "financial" },
  { to: "/devices", icon: Laptop, labelKey: "devices" },
  { to: "/tickets", icon: Ticket, labelKey: "myTickets" },
  {
    to: "/account-group",
    icon: User,
    labelKey: "account",
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
      { to: "/plans", labelKey: "plans" },
      { to: "/billing", labelKey: "billing" },
    ],
  },
];

const techNavItems: NavItem[] = [
  { to: "/tech/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { to: "/tickets", icon: Ticket, labelKey: "myTickets" },
  {
    to: "/account-group",
    icon: User,
    labelKey: "account",
    items: [
      { to: "/profile", labelKey: "profile" },
      { to: "/notifications/preferences", labelKey: "notificationPreferences" },
    ],
  },
];

const adminNavItems: NavItem[] = [
  { to: "/admin/dashboard", icon: Shield, labelKey: "adminDashboard" },
  { to: "/financial", icon: Landmark, labelKey: "financial" },
  { to: "/admin/users", icon: Users, labelKey: "userManagement" },
  { to: "/devices", icon: Laptop, labelKey: "devices" },
  { to: "/tickets", icon: Ticket, labelKey: "allTickets" },
  {
    to: "/settings-group",
    icon: Settings,
    labelKey: "settings",
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
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (user?.role !== "CLIENT") {
      Promise.resolve().then(() => {
        if (isMounted) setActiveSubscription(null);
      });
      return;
    }
    async function loadActiveSub() {
      setLoadingSub(true);
      try {
        const subs = await subscriptionService.getAll();
        if (isMounted) {
          const active = subs.find((sub) => sub.status === "ACTIVE");
          setActiveSubscription(active || null);
        }
      } catch (err) {
        console.error("Failed to load active subscription for sidebar", err);
      } finally {
        if (isMounted) setLoadingSub(false);
      }
    }
    loadActiveSub();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const navItems = useMemo(() => {
    if (user?.role === "ADMIN") return adminNavItems;
    if (user?.role === "TECHNICIAN") return techNavItems;
    return clientNavItems;
  }, [user?.role]);

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
    activeSubscription,
    loadingSub,
    navItems,
    checkIsActive,
    checkIsGroupActive,
  };
}
