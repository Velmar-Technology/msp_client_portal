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
          bg: "bg-primary/10 border border-primary/20",
          text: "text-primary",
          Icon: Ticket,
        };
      case "TICKET_ASSIGNED":
        return {
          bg: "bg-secondary/10 border border-secondary/20",
          text: "text-secondary",
          Icon: CheckSquare,
        };
      case "TICKET_STATUS_CHANGED":
      case "TICKET_CANCELLED":
        return {
          bg: "bg-destructive/10 border border-destructive/20",
          text: "text-destructive",
          Icon: ShieldAlert,
        };
      case "NEW_REPLY":
        return {
          bg: "bg-primary/10 border border-primary/20",
          text: "text-primary",
          Icon: MessageSquare,
        };
      default:
        return {
          bg: "bg-muted border border-border",
          text: "text-muted-foreground",
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
            fetchNotifications();
          }
        }}
        className={`relative p-1.5 transition-colors rounded-sm cursor-pointer ${
          isOpen
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-label={t("notifications.toggleAria", "Toggle notifications")}
      >
        <Bell className="h-4 w-4" />
        {bellUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-background box-content">
            {bellUnreadCount > 99 ? "99+" : bellUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-9 w-80 md:w-90 bg-card border border-border rounded-sm shadow-xl py-0 animate-fade-in z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
                {t("notifications.title", "Notifications")}
              </h3>
              {bellUnreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-destructive/10 text-destructive text-[9px] font-bold rounded-sm uppercase tracking-wider">
                  {t("notifications.unreadCount", "{{count}} unread", { count: bellUnreadCount })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {bellUnreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10 rounded-sm transition-colors cursor-pointer uppercase tracking-wider"
                  title={t("notifications.markAllRead", "Mark all as read")}
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
              {bellNotifications.length > 0 && (
                <button
                  onClick={() => dismissBellTray()}
                  className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-destructive hover:bg-destructive/10 rounded-sm transition-colors cursor-pointer uppercase tracking-wider"
                  title={t("notifications.clearTray", "Clear notifications")}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
              <button
                onClick={() => fetchNotifications()}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors cursor-pointer"
                title={t("notifications.refresh", "Refresh notifications")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-95 overflow-y-auto divide-y divide-border custom-scrollbar bg-card">
            {bellNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground mb-3">
                  <Bell className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {t("notifications.allCaughtUp", "All caught up!")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
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
                    className={`flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer relative ${
                      !notif.read ? "bg-muted/20" : ""
                    }`}
                  >
                    {/* Icon container */}
                    <div
                      className={`w-8 h-8 rounded-sm ${conf.bg} ${conf.text} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}
                    >
                      <conf.Icon className="h-4 w-4" />
                    </div>

                    {/* Content text */}
                    <div className="flex-1 pr-4 min-w-0">
                      <p
                        className={`text-xs text-foreground leading-tight truncate ${!notif.read ? "font-bold" : "font-medium"}`}
                      >
                        {notif.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[9px] text-muted-foreground font-mono block mt-1.5 uppercase tracking-wider">
                        {formatRelativeTime(notif.created_at, i18n.language)}
                      </span>
                    </div>

                    {/* Unread indicator dot */}
                    {!notif.read && (
                      <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-primary rounded-full shrink-0 animate-pulse" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer — Manage Preferences link */}
          <div className="border-t border-border bg-muted/30">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications/preferences");
              }}
              className="flex items-center justify-center gap-1.5 w-full py-2.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer uppercase tracking-wider"
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
