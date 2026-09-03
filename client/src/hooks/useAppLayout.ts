import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationStore } from "@/store/useNotificationStore";
import { subscriptionService, type Subscription } from "@/features/subscriptions";

export function useAppLayout() {
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const startStream = useNotificationStore((state) => state.startStream);
  const stopStream = useNotificationStore((state) => state.stopStream);

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      startStream();
    }
    return () => {
      stopStream();
    };
  }, [user, fetchNotifications, startStream, stopStream]);

  useEffect(() => {
    if (user?.role !== "CLIENT") {
       
      setActiveSubscription(null);
      setHasChecked(true);
      return;
    }

    let isMounted = true;
    async function checkSub() {
      try {
        const subs = await subscriptionService.getAll();
        if (isMounted) {
          const active = subs.find((s) => s.status === "ACTIVE" || s.status === "EXPIRING");
          setActiveSubscription(active || null);
          setHasChecked(true);
        }
      } catch (err) {
        console.error("Failed to check active subscription in layout:", err);
      }
    }

    checkSub();
    return () => {
      isMounted = false;
    };
  }, [user, location.pathname]);

  const isBlocked =
    user?.role === "CLIENT" &&
    hasChecked &&
    !activeSubscription &&
    location.pathname !== "/plans" &&
    location.pathname !== "/billing" &&
    location.pathname !== "/terms" &&
    location.pathname !== "/privacy" &&
    location.pathname !== "/help";

  const isReadOnly = user?.accountStatus === 'READ_ONLY';

  return {
    user,
    navigate,
    isBlocked,
    isReadOnly,
  };
}
