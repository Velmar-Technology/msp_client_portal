import { useState, useEffect, useRef, useMemo } from "react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useTranslation } from "react-i18next";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  Bell,
  Check,
  Ticket,
  MessageSquare,
  ShieldAlert,
  CheckSquare,
  RefreshCw,
  Settings2,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    dismissBellTray,
    fetchNotifications,
    bellClearedAt,
  } = useNotificationStore();

  const bellNotifications = useMemo(() => {
    if (!bellClearedAt) return notifications;
    return notifications.filter((n) => {
      const time = new Date(n.created_at).getTime();
      return isNaN(time) || time > bellClearedAt;
    });
  }, [notifications, bellClearedAt]);

  const bellUnreadCount = useMemo(() => {
    return bellNotifications.filter((n) => !n.read).length;
  }, [bellNotifications]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (id: string, link: string | null) => {
    setIsOpen(false);
    await markAsRead(id);
    if (link) {
      navigate(link);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TICKET_CREATED":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800",
          text: "text-emerald-700 dark:text-emerald-400",
          Icon: Ticket,
        };
      case "TICKET_ASSIGNED":
        return {
          bg: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800",
          text: "text-blue-700 dark:text-blue-400",
          Icon: CheckSquare,
        };
      case "TICKET_STATUS_CHANGED":
      case "TICKET_CANCELLED":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800",
          text: "text-amber-700 dark:text-amber-400",
          Icon: ShieldAlert,
        };
      case "NEW_REPLY":
        return {
          bg: "bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800",
          text: "text-indigo-700 dark:text-indigo-400",
          Icon: MessageSquare,
        };
      default:
        return {
          bg: "bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700",
          text: "text-zinc-600 dark:text-zinc-400",
          Icon: Bell,
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications(); // Refresh notifications list on open
          }
        }}
        className={`relative p-1.5 transition-colors rounded-sm cursor-pointer ${
          isOpen
            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
        aria-label={t("notifications.toggleAria", "Toggle notifications")}
      >
        <Bell className="h-4 w-4" />
        {bellUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 bg-red-600 text-white dark:bg-red-500 text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-white dark:border-zinc-950 box-content">
            {bellUnreadCount > 99 ? "99+" : bellUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-9 w-80 md:w-[360px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-xl py-0 animate-fade-in z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                {t("notifications.title", "Notifications")}
              </h3>
              {bellUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] font-bold rounded-sm uppercase tracking-wider">
                  {t("notifications.unreadCount", "{{count}} unread", { count: bellUnreadCount })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {bellUnreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-sm transition-colors cursor-pointer uppercase tracking-wider"
                  title={t("notifications.markAllRead", "Mark all as read")}
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
              {bellNotifications.length > 0 && (
                <button
                  onClick={() => dismissBellTray()}
                  className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-sm transition-colors cursor-pointer uppercase tracking-wider"
                  title={t("notifications.clearTray", "Clear notifications")}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => fetchNotifications()}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors cursor-pointer"
                title={t("notifications.refresh", "Refresh notifications")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-900 custom-scrollbar bg-white dark:bg-zinc-950">
            {bellNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-3">
                  <Bell className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("notifications.allCaughtUp", "All caught up!")}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {t("notifications.noNotifications", "No notifications yet.")}
                </p>
              </div>
            ) : (
              bellNotifications.map((notif) => {
                const conf = getNotificationIcon(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif.id, notif.link)}
                    className={`flex gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer relative ${
                      !notif.read ? "bg-zinc-50/50 dark:bg-zinc-900/20" : ""
                    }`}
                  >
                    {/* Icon container */}
                    <div
                      className={`w-8 h-8 rounded-sm ${conf.bg} ${conf.text} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}
                    >
                      <conf.Icon className="h-4 w-4" />
                    </div>

                    {/* Content text */}
                    <div className="flex-1 pr-4 min-w-0">
                      <p
                        className={`text-xs text-zinc-900 dark:text-zinc-100 leading-tight truncate ${!notif.read ? "font-bold" : "font-medium"}`}
                      >
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono block mt-1.5 uppercase tracking-wider">
                        {formatRelativeTime(notif.created_at, i18n.language)}
                      </span>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.read && (
                      <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Manage Preferences link */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications/preferences");
              }}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer uppercase tracking-wider"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{t("notifications.managePreferences", "Manage Preferences")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
