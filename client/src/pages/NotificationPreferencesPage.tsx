import { useState, useEffect, useCallback } from "react";
import { Page } from "@/components/Page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Bell,
  Mail,
  MessageSquare,
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
  notificationPreferenceService,
  type NotificationPreferencesMap,
  type NotificationEventType,
  type ChannelPreference,
} from "../services/notificationPreferenceService";

/**
 * Event definitions for the preference matrix.
 * Each row in the table corresponds to one event type.
 */
const EVENT_DEFINITIONS: {
  key: NotificationEventType;
  label: string;
  description: string;
  icon: typeof Bell;
  color: string;
  bgColor: string;
}[] = [
  {
    key: "TICKET_CREATED",
    label: "Ticket Created",
    description: "When a new support ticket is opened",
    icon: Ticket,
    color: "text-tertiary",
    bgColor: "bg-tertiary/10",
  },
  {
    key: "TICKET_ASSIGNED",
    label: "Ticket Assigned",
    description: "When a ticket is assigned to a technician",
    icon: UserCheck,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    key: "TICKET_STATUS_CHANGED",
    label: "Status Changed",
    description: "When a ticket status is updated",
    icon: RefreshCw,
    color: "text-info",
    bgColor: "bg-info/10",
  },
  {
    key: "TICKET_CANCELLED",
    label: "Ticket Cancelled",
    description: "When a ticket is cancelled",
    icon: XCircle,
    color: "text-error",
    bgColor: "bg-error/10",
  },
  {
    key: "NEW_REPLY",
    label: "New Reply",
    description: "When someone replies to your ticket",
    icon: MessageCircle,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

/**
 * Channel definitions for the preference matrix columns.
 */
const CHANNEL_DEFINITIONS: {
  key: keyof ChannelPreference;
  label: string;
  icon: typeof Bell;
  description: string;
}[] = [
  { key: "in_app", label: "In-App", icon: Bell, description: "Bell & toast notifications" },
  { key: "email", label: "Email", icon: Mail, description: "Email notifications" },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone, description: "WhatsApp messages" },
];

/**
 * Events that cannot have in_app disabled.
 */
const FORCE_IN_APP_EVENTS: NotificationEventType[] = ["TICKET_CREATED", "TICKET_STATUS_CHANGED"];

export function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreferencesMap | null>(null);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferencesMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const fetchPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await notificationPreferenceService.getPreferences();
      setPreferences(result.data.preferences);
      setOriginalPreferences(result.data.preferences);
    } catch {
      setMessage("Failed to load notification preferences.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleToggle = (event: NotificationEventType, channel: keyof ChannelPreference) => {
    if (!preferences) return;

    // Don't allow disabling in_app for critical events
    if (channel === "in_app" && FORCE_IN_APP_EVENTS.includes(event) && preferences[event].in_app) {
      return;
    }

    setPreferences((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [event]: {
          ...prev[event],
          [channel]: !prev[event][channel],
        },
      };
    });
  };

  const hasChanges = (): boolean => {
    if (!preferences || !originalPreferences) return false;
    return JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
  };

  const handleSave = async () => {
    if (!preferences) return;
    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const result = await notificationPreferenceService.updatePreferences(preferences);
      setPreferences(result.data.preferences);
      setOriginalPreferences(result.data.preferences);
      setMessage("Notification preferences saved successfully.");
      setMessageType("success");
    } catch {
      setMessage("Failed to save notification preferences. Please try again.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  };

  const isLocked = (event: NotificationEventType, channel: keyof ChannelPreference): boolean => {
    return channel === "in_app" && FORCE_IN_APP_EVENTS.includes(event);
  };

  if (isLoading) {
    return (
      <Page className="max-w-7xl" title="Notification Preferences" subtitle="Choose how you want to be notified">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      className="max-w-7xl"
      title="Notification Preferences"
      subtitle="Choose how and when you receive notifications for each event type"
    >
      {/* Info Banner */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-h3 text-on-surface" style={{ fontFamily: "var(--font-heading)" }}>
              Delivery Channels
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Control which channels receive notifications for each event type. Critical system events will always
              deliver in-app notifications to ensure you never miss important updates.
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message && messageType && (
        <Alert variant={messageType === "success" ? "success" : "destructive"} className="mb-6 animate-fade-in">
          {messageType === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{messageType === "success" ? "Saved" : "Error"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Preferences Matrix */}
      {preferences && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_repeat(3,80px)] md:grid-cols-[1fr_repeat(3,100px)] items-center gap-2 px-4 md:px-6 py-4 border-b border-outline-variant bg-surface-container-low/30">
            <div className="text-label-md font-bold text-on-surface">Event Type</div>
            {CHANNEL_DEFINITIONS.map((channel) => (
              <div key={channel.key} className="flex flex-col items-center text-center">
                <channel.icon className="h-4 w-4 text-on-surface-variant mb-1" />
                <span className="text-[11px] font-semibold text-on-surface">{channel.label}</span>
              </div>
            ))}
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-outline-variant/50">
            {EVENT_DEFINITIONS.map((event) => {
              const EventIcon = event.icon;
              return (
                <div
                  key={event.key}
                  className="grid grid-cols-[1fr_repeat(3,80px)] md:grid-cols-[1fr_repeat(3,100px)] items-center gap-2 px-4 md:px-6 py-4 hover:bg-surface-container-low/20 transition-colors"
                >
                  {/* Event info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${event.bgColor} ${event.color} flex items-center justify-center shrink-0`}
                    >
                      <EventIcon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-semibold text-on-surface leading-tight truncate">{event.label}</p>
                      <p className="text-[11px] text-on-surface-variant leading-snug mt-0.5 hidden md:block">
                        {event.description}
                      </p>
                    </div>
                  </div>

                  {/* Channel toggles */}
                  {CHANNEL_DEFINITIONS.map((channel) => {
                    const enabled = preferences[event.key][channel.key];
                    const locked = isLocked(event.key, channel.key);

                    return (
                      <div key={channel.key} className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(event.key, channel.key)}
                          disabled={locked && enabled}
                          className={`
                            relative w-11 h-6 rounded-full transition-all duration-300 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1
                            ${enabled ? "bg-primary shadow-inner" : "bg-outline-variant/40"}
                            ${locked && enabled ? "cursor-not-allowed opacity-80" : "cursor-pointer hover:shadow-md"}
                          `}
                          title={
                            locked && enabled
                              ? "This channel cannot be disabled for critical events"
                              : `${enabled ? "Disable" : "Enable"} ${channel.label} for ${event.label}`
                          }
                          aria-label={`${enabled ? "Disable" : "Enable"} ${channel.label} for ${event.label}`}
                          id={`toggle-${event.key}-${channel.key}`}
                        >
                          {/* Toggle knob */}
                          <span
                            className={`
                              absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-300 ease-in-out
                              shadow-sm flex items-center justify-center
                              ${enabled ? "translate-x-5 bg-on-primary" : "translate-x-0 bg-surface-container-lowest"}
                            `}
                          >
                            {locked && enabled && <Lock className="h-2.5 w-2.5 text-primary" />}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend Footer */}
          <div className="px-4 md:px-6 py-3 border-t border-outline-variant bg-surface-container-low/20">
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
              <Lock className="h-3 w-3" />
              <span>Locked toggles cannot be disabled — critical events always deliver in-app notifications.</span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          {hasChanges() && (
            <span className="text-[12px] text-warning font-medium animate-fade-in flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Unsaved changes
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges()}
          className="bg-primary text-on-primary px-6 py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </Page>
  );
}
