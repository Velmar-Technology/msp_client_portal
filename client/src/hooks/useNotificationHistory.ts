import { useState, useMemo, useEffect, useCallback } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Notification } from "@/services/notificationService";

export type ReadFilter = "ALL" | "UNREAD" | "READ";
export type TypeFilter = "ALL" | "TICKET_CREATED" | "TICKET_ASSIGNED" | "TICKET_STATUS_CHANGED" | "TICKET_CANCELLED" | "NEW_REPLY" | "OTHER";

export function useNotificationHistory() {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    startStream,
  } = useNotificationStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  useEffect(() => {
    fetchNotifications();
    startStream();
  }, [fetchNotifications, startStream]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item: Notification) => {
      // 1. Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesMessage = item.message.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMessage) return false;
      }

      // 2. Filter by read status
      if (readFilter === "UNREAD" && item.read) return false;
      if (readFilter === "READ" && !item.read) return false;

      // 3. Filter by type
      if (typeFilter !== "ALL") {
        if (typeFilter === "OTHER") {
          const knownTypes = [
            "TICKET_CREATED",
            "TICKET_ASSIGNED",
            "TICKET_STATUS_CHANGED",
            "TICKET_CANCELLED",
            "NEW_REPLY",
          ];
          if (knownTypes.includes(item.type)) return false;
        } else if (item.type !== typeFilter) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, searchQuery, readFilter, typeFilter]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead();
  }, [markAllAsRead]);

  const handleClearAll = useCallback(async () => {
    await clearNotifications();
  }, [clearNotifications]);

  const handleRefresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications: filteredNotifications,
    totalCount: notifications.length,
    unreadCount,
    isLoading,
    searchQuery,
    setSearchQuery,
    readFilter,
    setReadFilter,
    typeFilter,
    setTypeFilter,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleClearAll,
    handleRefresh,
  };
}
