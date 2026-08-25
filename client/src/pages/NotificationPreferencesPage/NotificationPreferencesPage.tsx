import { useState } from "react";
import { Page } from "@/components/Page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";
import {
  Bell,
  Mail,
  Save,

  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  History,
  Sliders,
} from "lucide-react";

import {
  type NotificationPreferencesMap,
  type NotificationEventType,
  type ChannelPreference,
} from "../../services/notificationPreferenceService";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "react-i18next";
import { NotificationHistorySection } from "./NotificationHistorySection";
import { EmailTemplatesGallerySection } from "./EmailTemplatesGallerySection";

import {
  NOTIFICATION_EVENT_DEFINITIONS as EVENT_DEFINITIONS,
  NOTIFICATION_CHANNEL_DEFINITIONS as CHANNEL_DEFINITIONS,
} from "@/constants/notifications";


/* --- Sub-Components --- */

const ToggleSwitch = ({
  enabled,
  locked,
  onClick,
  ariaLabel,
}: {
  enabled: boolean;
  locked: boolean;
  onClick: () => void;
  ariaLabel: string;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={locked && enabled}
    aria-label={ariaLabel}
    className={`
      relative h-4 w-7 p-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-ring
      ${enabled ? "bg-primary" : "bg-muted"}
      ${locked && enabled ? "cursor-not-allowed opacity-50" : ""}
    `}
  >
    <span
      className={`
        inline-block h-3 w-3 transform rounded-full transition duration-200 ease-in-out shadow-xs
        ${enabled ? "translate-x-1.5 bg-primary-foreground" : "-translate-x-1.5 bg-muted-foreground"}
      `}
    />
  </Button>
);

const PreferenceRow = ({
  event,
  preferences,
  onToggle,
  isLocked,
}: {
  event: (typeof EVENT_DEFINITIONS)[0];
  preferences: ChannelPreference;
  onToggle: (eventKey: NotificationEventType, channelKey: keyof ChannelPreference) => void;
  isLocked: (eventKey: NotificationEventType, channelKey: keyof ChannelPreference) => boolean;
}) => {
  const { t } = useTranslation();
  const EventIcon = event.icon;
  return (
    <div className="grid grid-cols-[1fr_repeat(3,60px)] sm:grid-cols-[1fr_repeat(3,80px)] items-center gap-4 border-b border-border px-4 py-2.5 last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border bg-card shadow-xs">
          <EventIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {t(`notificationPreferences.events.${event.key}.label`, event.label)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t(`notificationPreferences.events.${event.key}.description`, event.description)}
          </span>
        </div>
      </div>
      {CHANNEL_DEFINITIONS.map((channel) => (
        <div key={channel.key} className="flex justify-center">
          <ToggleSwitch
            enabled={preferences[channel.key]}
            locked={isLocked(event.key, channel.key)}
            onClick={() => onToggle(event.key, channel.key)}
            ariaLabel={t("notificationPreferences.toggleAriaLabel", {
              defaultValue: "Toggle {{channel}} for {{event}}",
              channel: t(`notificationPreferences.channels.${channel.key}`, channel.label),
              event: t(`notificationPreferences.events.${event.key}.label`, event.label),
            })}
          />
        </div>
      ))}
    </div>
  );
};

const PreferenceMatrix = ({
  preferences,
  onToggle,
  isLocked,
}: {
  preferences: NotificationPreferencesMap;
  onToggle: (eventKey: NotificationEventType, channelKey: keyof ChannelPreference) => void;
  isLocked: (eventKey: NotificationEventType, channelKey: keyof ChannelPreference) => boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="grid grid-cols-[1fr_repeat(3,60px)] sm:grid-cols-[1fr_repeat(3,80px)] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("notificationPreferences.eventType", "Event Type")}
        </div>
        {CHANNEL_DEFINITIONS.map((channel) => (
          <div key={channel.key} className="flex flex-col items-center gap-1">
            <channel.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`notificationPreferences.channels.${channel.key}`, channel.label)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        {EVENT_DEFINITIONS.map((event) => (
          <PreferenceRow
            key={event.key}
            event={event}
            preferences={preferences[event.key]}
            onToggle={onToggle}
            isLocked={isLocked}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-2">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {t("notificationPreferences.lockedTogglesInfo", "Locked toggles cannot be disabled.")}
        </span>
      </div>
    </div>
  );
};

const HeaderInfo = () => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-xs">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-muted">
        <Bell className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold text-foreground font-heading">
          {t("notificationPreferences.deliveryChannels", "Delivery Channels")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t(
            "notificationPreferences.deliveryChannelsDesc",
            "Control which channels receive notifications for each event type. Critical system events always deliver in-app notifications."
          )}
        </p>
      </div>
    </div>
  );
};

const StatusBanner = ({ message, type }: { message: string; type: "success" | "error" | "" }) => {
  const { t } = useTranslation();
  if (!message || !type) return null;

  return (
    <Alert
      variant={type === "success" ? "default" : "destructive"}
      className={`mb-6 px-3 py-2 ${type === "success" ? "border-border bg-card" : ""}`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle className="text-sm font-medium">
        {type === "success" ? t("notificationPreferences.saved", "Saved") : t("notificationPreferences.error", "Error")}
      </AlertTitle>
      <AlertDescription className="text-xs">{t(message, message)}</AlertDescription>
    </Alert>
  );
};

const ActionFooter = ({
  hasChanges,
  isSaving,
  onSave,
}: {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center">
        {hasChanges && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {t("notificationPreferences.unsavedChanges", "Unsaved changes")}
          </span>
        )}
      </div>
      <Button
        type="button"
        onClick={onSave}
        disabled={isSaving || !hasChanges}
        className="gap-2 text-xs"
      >
        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {isSaving
          ? t("notificationPreferences.saving", "Saving...")
          : t("notificationPreferences.saveChanges", "Save Changes")}
      </Button>
    </div>
  );
};

/* --- Main Component --- */

export function NotificationPreferencesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("channels");
  const { preferences, isLoading, isSaving, message, messageType, hasChanges, handleToggle, handleSave, isLocked } =
    useNotificationPreferences();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN";
  const showSkeleton = useDeferredLoading(isLoading, SKELETON_DISPLAY_DELAY_MS);

  if (isLoading) {
    if (!showSkeleton) return null;
    return (
      <Page
        className="max-w-4xl"
        title={t("notificationPreferences.title", "Notifications & Preferences")}
        subtitle={t("notificationPreferences.subtitle", "Manage delivery channels and view alert history")}
      >
        <div className="flex min-h-100 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Page>
    );
  }

  const effectiveActiveTab = !isAdmin && activeTab === "templates" ? "channels" : activeTab;

  return (
    <Page
      className="max-w-4xl"
      title={t("notificationPreferences.title", "Notifications & Preferences")}
      subtitle={t("notificationPreferences.subtitle", "Manage delivery channels and view alert history")}
    >
      <Tabs value={effectiveActiveTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="channels" className="gap-2">
            <Sliders className="h-3.5 w-3.5" />
            <span>{t("notificationPreferences.tabChannels", "Delivery Channels")}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 relative">
            <History className="h-3.5 w-3.5" />
            <span>{t("notificationPreferences.tabHistory", "Notification History")}</span>
            {unreadCount > 0 && (
              <span
                className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.2 text-[10px] font-semibold"
                title={t("notifications.unreadCount", { count: unreadCount, defaultValue: "{{count}} unread" })}
                aria-label={t("notifications.unreadCount", { count: unreadCount, defaultValue: "{{count}} unread" })}
              >
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="templates" className="gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span>{t("notificationPreferences.tabTemplates", "Email Templates")}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="channels">
          <div className="flex flex-col">
            <HeaderInfo />
            <StatusBanner message={message} type={messageType} />

            {preferences && <PreferenceMatrix preferences={preferences} onToggle={handleToggle} isLocked={isLocked} />}

            <ActionFooter hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <NotificationHistorySection />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="templates">
            <EmailTemplatesGallerySection />
          </TabsContent>
        )}
      </Tabs>
    </Page>
  );
}

export default NotificationPreferencesPage;
