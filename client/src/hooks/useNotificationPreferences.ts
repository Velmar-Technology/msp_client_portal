import { useState, useEffect, useCallback } from "react";
import {
  notificationPreferenceService,
  type NotificationPreferencesMap,
  type NotificationEventType,
  type ChannelPreference,
} from "../services/notificationPreferenceService";

export const FORCE_IN_APP_EVENTS: NotificationEventType[] = [
  "TICKET_CREATED",
  "TICKET_STATUS_CHANGED",
];

export function useNotificationPreferences() {
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

  const handleToggle = useCallback((event: NotificationEventType, channel: keyof ChannelPreference) => {
    setPreferences((prev) => {
      if (!prev) return prev;

      // Prevent disabling in-app for critical events
      if (channel === "in_app" && FORCE_IN_APP_EVENTS.includes(event) && prev[event].in_app) {
        return prev;
      }

      return {
        ...prev,
        [event]: {
          ...prev[event],
          [channel]: !prev[event][channel],
        },
      };
    });
  }, []);

  const hasChanges = useCallback((): boolean => {
    if (!preferences || !originalPreferences) return false;
    return JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
  }, [preferences, originalPreferences]);

  const handleSave = useCallback(async () => {
    if (!preferences) return;
    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const result = await notificationPreferenceService.updatePreferences(preferences);
      setPreferences(result.data.preferences);
      setOriginalPreferences(result.data.preferences);
      setMessage("Preferences saved successfully.");
      setMessageType("success");
    } catch {
      setMessage("Failed to save preferences. Please try again.");
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }, [preferences]);

  const isLocked = useCallback((event: NotificationEventType, channel: keyof ChannelPreference): boolean => {
    return channel === "in_app" && FORCE_IN_APP_EVENTS.includes(event);
  }, []);

  return {
    preferences,
    isLoading,
    isSaving,
    message,
    messageType,
    hasChanges: hasChanges(),
    handleToggle,
    handleSave,
    isLocked,
  };
}
