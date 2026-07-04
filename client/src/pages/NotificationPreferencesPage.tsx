import { Page } from "@/components/Page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Bell,
  Mail,
  Smartphone,
  Save,
  CheckCircle2,
  AlertCircle,
  Ticket,
  UserCheck,
  RefreshCw,
  XCircle,
  MessageCircle,
  Lock,
  Loader2,
} from "lucide-react";
import {
  type NotificationPreferencesMap,
  type NotificationEventType,
  type ChannelPreference,
} from "../services/notificationPreferenceService";
import { useNotificationPreferences } from "../hooks/useNotificationPreferences";

/**
 * Event definitions for the preference matrix.
 */
const EVENT_DEFINITIONS: {
  key: NotificationEventType;
  label: string;
  description: string;
  icon: typeof Bell;
}[] = [
  {
    key: "TICKET_CREATED",
    label: "Ticket Created",
    description: "When a new support ticket is opened",
    icon: Ticket,
  },
  {
    key: "TICKET_ASSIGNED",
    label: "Ticket Assigned",
    description: "When a ticket is assigned to a technician",
    icon: UserCheck,
  },
  {
    key: "TICKET_STATUS_CHANGED",
    label: "Status Changed",
    description: "When a ticket status is updated",
    icon: RefreshCw,
  },
  {
    key: "TICKET_CANCELLED",
    label: "Ticket Cancelled",
    description: "When a ticket is cancelled",
    icon: XCircle,
  },
  {
    key: "NEW_REPLY",
    label: "New Reply",
    description: "When someone replies to your ticket",
    icon: MessageCircle,
  },
];

/**
 * Channel definitions for the preference matrix columns.
 */
const CHANNEL_DEFINITIONS: {
  key: keyof ChannelPreference;
  label: string;
  icon: typeof Bell;
}[] = [
  { key: "in_app", label: "In-App", icon: Bell },
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone },
];

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
  <button
    type="button"
    onClick={onClick}
    disabled={locked && enabled}
    aria-label={ariaLabel}
    className={`
      relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-2 dark:focus:ring-offset-zinc-950
      ${enabled ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"}
      ${locked && enabled ? "cursor-not-allowed opacity-50" : ""}
    `}
  >
    <span
      className={`
        inline-block h-3 w-3 transform rounded-full transition duration-200 ease-in-out shadow-sm
        ${enabled ? "translate-x-3.5 bg-white dark:bg-zinc-900" : "translate-x-0.5 bg-white dark:bg-zinc-300"}
      `}
    />
  </button>
);

const PreferenceRow = ({
  event,
  preferences,
  onToggle,
  isLocked,
}: {
  event: typeof EVENT_DEFINITIONS[0];
  preferences: ChannelPreference;
  onToggle: (eventKey: NotificationEventType, channelKey: keyof ChannelPreference) => void;
  isLocked: (eventKey: NotificationEventType, channelKey: keyof ChannelPreference) => boolean;
}) => {
  const EventIcon = event.icon;
  return (
    <div className="grid grid-cols-[1fr_repeat(3,60px)] sm:grid-cols-[1fr_repeat(3,80px)] items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 px-4 py-2.5 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm">
          <EventIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{event.label}</span>
          <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{event.description}</span>
        </div>
      </div>
      {CHANNEL_DEFINITIONS.map((channel) => (
        <div key={channel.key} className="flex justify-center">
          <ToggleSwitch
            enabled={preferences[channel.key]}
            locked={isLocked(event.key, channel.key)}
            onClick={() => onToggle(event.key, channel.key)}
            ariaLabel={`Toggle ${channel.label} for ${event.label}`}
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
}) => (
  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
    <div className="grid grid-cols-[1fr_repeat(3,60px)] sm:grid-cols-[1fr_repeat(3,80px)] items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Event Type</div>
      {CHANNEL_DEFINITIONS.map((channel) => (
        <div key={channel.key} className="flex flex-col items-center gap-1">
          <channel.icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {channel.label}
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
    <div className="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-2">
      <Lock className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">Locked toggles cannot be disabled.</span>
    </div>
  </div>
);

const HeaderInfo = () => (
  <div className="mb-6 flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
      <Bell className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
    </div>
    <div className="flex flex-col gap-0.5">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Delivery Channels</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Control which channels receive notifications for each event type. Critical system events always
        deliver in-app notifications.
      </p>
    </div>
  </div>
);

const StatusBanner = ({ message, type }: { message: string; type: "success" | "error" | "" }) => {
  if (!message || !type) return null;

  return (
    <Alert
      variant={type === "success" ? "default" : "destructive"}
      className={`mb-6 px-3 py-2 ${type === "success" ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900" : ""}`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle className="text-sm font-medium dark:text-zinc-100">{type === "success" ? "Saved" : "Error"}</AlertTitle>
      <AlertDescription className="text-xs dark:text-zinc-300">{message}</AlertDescription>
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
}) => (
  <div className="mt-4 flex items-center justify-between">
    <div className="flex items-center">
      {hasChanges && (
        <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-900 dark:bg-zinc-100" />
          Unsaved changes
        </span>
      )}
    </div>
    <button
      type="button"
      onClick={onSave}
      disabled={isSaving || !hasChanges}
      className={`
        flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-all
        ${
          isSaving || !hasChanges
            ? "cursor-not-allowed bg-zinc-300 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
            : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 active:scale-95"
        }
      `}
    >
      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      {isSaving ? "Saving..." : "Save Changes"}
    </button>
  </div>
);

/* --- Main Component --- */

export function NotificationPreferencesPage() {
  const {
    preferences,
    isLoading,
    isSaving,
    message,
    messageType,
    hasChanges,
    handleToggle,
    handleSave,
    isLocked,
  } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Page className="max-w-3xl" title="Notification Preferences" subtitle="Manage your alert delivery channels">
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400 dark:text-zinc-600" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      className="max-w-3xl"
      title="Notification Preferences"
      subtitle="Manage your alert delivery channels"
    >
      <div className="flex flex-col">
        <HeaderInfo />
        <StatusBanner message={message} type={messageType} />

        {preferences && (
          <PreferenceMatrix
            preferences={preferences}
            onToggle={handleToggle}
            isLocked={isLocked}
          />
        )}

        <ActionFooter hasChanges={hasChanges} isSaving={isSaving} onSave={handleSave} />
      </div>
    </Page>
  );
}
