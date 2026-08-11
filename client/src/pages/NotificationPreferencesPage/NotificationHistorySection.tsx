import { useTranslation } from "react-i18next";
import {
  Bell,
  Search,
  CheckCheck,
  Trash2,
  RefreshCw,
  ExternalLink,
  Ticket,
  UserCheck,
  XCircle,
  MessageCircle,
  Clock,
  Check,
  Loader2,
  Filter,
} from "lucide-react";
import { useNotificationHistory, type ReadFilter, type TypeFilter } from "@/hooks/useNotificationHistory";
import type { Notification } from "@/services/notificationService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";

import { formatRelativeTime } from "@/lib/formatRelativeTime";

function getNotificationBadgeInfo(type: string) {
  switch (type) {
    case "TICKET_CREATED":
      return {
        labelKey: "notificationHistory.ticketCreated",
        defaultLabel: "Ticket Created",
        icon: Ticket,
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      };
    case "TICKET_ASSIGNED":
      return {
        labelKey: "notificationHistory.ticketAssigned",
        defaultLabel: "Ticket Assigned",
        icon: UserCheck,
        className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
      };
    case "TICKET_STATUS_CHANGED":
      return {
        labelKey: "notificationHistory.statusChanged",
        defaultLabel: "Status Changed",
        icon: RefreshCw,
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      };
    case "TICKET_CANCELLED":
      return {
        labelKey: "notificationHistory.ticketCancelled",
        defaultLabel: "Ticket Cancelled",
        icon: XCircle,
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
      };
    case "NEW_REPLY":
      return {
        labelKey: "notificationHistory.newReply",
        defaultLabel: "New Reply",
        icon: MessageCircle,
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      };
    default:
      return {
        labelKey: "notificationHistory.other",
        defaultLabel: type,
        icon: Bell,
        className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
      };
  }
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const { t, i18n } = useTranslation();
  const badge = getNotificationBadgeInfo(notification.type);
  const BadgeIcon = badge.icon;

  return (
    <div
      className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border transition-all ${
        notification.read
          ? "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
          : "bg-zinc-50/80 dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700 border-l-4 border-l-zinc-900 dark:border-l-zinc-100"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${badge.className}`}>
          <BadgeIcon className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {notification.title}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
            >
              {t(badge.labelKey, badge.defaultLabel)}
            </span>
            {!notification.read && (
              <span
                className="h-2 w-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                title={t("notificationHistory.unreadTooltip", "Unread")}
              />
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed break-words">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(notification.created_at, i18n.language)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
        {notification.link && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => {
              window.location.href = notification.link!;
            }}
          >
            <span>{t("notificationHistory.view", "View")}</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("notificationHistory.markRead", "Mark read")}</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function NotificationHistorySection() {
  const { t } = useTranslation();
  const {
    notifications,
    totalCount,
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
  } = useNotificationHistory();

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar / Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              placeholder={t("notificationHistory.searchPlaceholder", "Search notifications...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-zinc-50 dark:bg-zinc-900/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 gap-1.5 text-xs"
              title={t("notificationHistory.refreshTooltip", "Refresh notifications")}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{t("notificationHistory.refresh", "Refresh")}</span>
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{t("notificationHistory.markAllRead", "Mark all read")}</span>
              </Button>
            )}

            {totalCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t("notificationHistory.clearAll", "Clear history")}</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("notificationHistory.clearConfirmTitle", "Clear all notifications?")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(
                        "notificationHistory.clearConfirmDesc",
                        "This action will permanently delete all notification history records for your account. This cannot be undone."
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                      {t("notificationHistory.confirmClear", "Clear History")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-medium">{t("notificationHistory.filters", "Filters")}:</span>
          </div>

          <Select value={readFilter} onValueChange={(val) => setReadFilter(val as ReadFilter)}>
            <SelectTrigger size="sm" className="h-7 text-xs w-[110px]">
              <SelectValue placeholder={t("notificationHistory.statusPlaceholder", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("notificationHistory.allStatus", "All Status")}</SelectItem>
              <SelectItem value="UNREAD">{t("notificationHistory.unreadOnly", "Unread")}</SelectItem>
              <SelectItem value="READ">{t("notificationHistory.readOnly", "Read")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val as TypeFilter)}>
            <SelectTrigger size="sm" className="h-7 text-xs w-[170px]">
              <SelectValue placeholder={t("notificationHistory.eventTypePlaceholder", "Event Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("notificationHistory.allTypes", "All Event Types")}</SelectItem>
              <SelectItem value="TICKET_CREATED">{t("notificationHistory.ticketCreated", "Ticket Created")}</SelectItem>
              <SelectItem value="TICKET_ASSIGNED">{t("notificationHistory.ticketAssigned", "Ticket Assigned")}</SelectItem>
              <SelectItem value="TICKET_STATUS_CHANGED">{t("notificationHistory.statusChanged", "Status Changed")}</SelectItem>
              <SelectItem value="TICKET_CANCELLED">{t("notificationHistory.ticketCancelled", "Ticket Cancelled")}</SelectItem>
              <SelectItem value="NEW_REPLY">{t("notificationHistory.newReply", "New Reply")}</SelectItem>
              <SelectItem value="OTHER">{t("notificationHistory.other", "Other")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
            {t("notificationHistory.showingCount", "Showing {{count}} of {{total}}", {
              count: notifications.length,
              total: totalCount,
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading && notifications.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400 dark:text-zinc-600" />
        </div>
      ) : notifications.length === 0 ? (
        <Empty className="min-h-[300px] rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <EmptyMedia variant="icon">
            <Bell className="h-5 w-5 text-zinc-400" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>{t("notificationHistory.emptyTitle", "No Notifications Found")}</EmptyTitle>
            <EmptyDescription>
              {searchQuery || readFilter !== "ALL" || typeFilter !== "ALL"
                ? t("notificationHistory.emptyFilterDesc", "No notifications match your search and filter criteria.")
                : t("notificationHistory.emptyDesc", "You don't have any notification history yet.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
