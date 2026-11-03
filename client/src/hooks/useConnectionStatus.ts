import { useState, useEffect } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

/**
 * Hook to track live network and real-time event stream connectivity.
 * Combines browser `navigator.onLine` state with `useNotificationStore` SSE status.
 *
 * @returns ConnectionStatus - 'connected' | 'reconnecting' | 'offline'
 */
export function useConnectionStatus(): ConnectionStatus {
  const storeStatus = useNotificationStore((s) => s.connectionStatus);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isBrowserOnline) {
    return "offline";
  }

  return storeStatus || "connected";
}
