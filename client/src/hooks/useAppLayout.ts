import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useNotificationStore } from "@/store/useNotificationStore";
import { subscriptionService } from "@/services/subscriptionService";
import type { Subscription } from "@/services/subscriptionService";

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
    fetchNotifications();
    startStream();
    return () => {
      stopStream();
    };
  }, [fetchNotifications, startStream, stopStream]);

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
          const active = subs.find((s) => s.status === "ACTIVE");
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

  const isBlocked = user?.role === "CLIENT" && hasChecked && !activeSubscription && location.pathname !== "/plans";

  return {
    user,
    navigate,
    isBlocked,
  };
}
