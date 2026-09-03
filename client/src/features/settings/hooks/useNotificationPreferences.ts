import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  notificationPreferenceService,
  type NotificationPreferencesMap,
  type NotificationEventType,
  type ChannelPreference,
} from "../api/notificationPreferenceService";

import { FORCE_IN_APP_EVENTS } from "@/constants/notifications";
export { FORCE_IN_APP_EVENTS };


export function useNotificationPreferences() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreferencesMap | null>(null);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferencesMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const result = await notificationPreferenceService.getPreferences();
        if (isMounted) {
          setPreferences(result.data.preferences);
          setOriginalPreferences(result.data.preferences);
        }
      } catch {
        if (isMounted) {
          setMessage(t("notificationPreferences.loadFailed"));
          setMessageType("error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [t]);

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

  const hasChanges = Boolean(
    preferences &&
    originalPreferences &&
    JSON.stringify(preferences) !== JSON.stringify(originalPreferences)
  );

  const handleSave = useCallback(async () => {
    if (!preferences) return;
    setIsSaving(true);
    setMessage("");
    setMessageType("");

    try {
      const result = await notificationPreferenceService.updatePreferences(preferences);
      setPreferences(result.data.preferences);
      setOriginalPreferences(result.data.preferences);
      setMessage(t("notificationPreferences.saveSuccess"));
      setMessageType("success");
    } catch {
      setMessage(t("notificationPreferences.saveFailed"));
      setMessageType("error");
    } finally {
      setIsSaving(false);
    }
  }, [preferences, t]);

  const isLocked = useCallback((event: NotificationEventType, channel: keyof ChannelPreference): boolean => {
    return channel === "in_app" && FORCE_IN_APP_EVENTS.includes(event);
  }, []);

  return {
    preferences,
    isLoading,
    isSaving,
    message,
    messageType,
    hasChanges,
    handleToggle,
    handleSave,
    isLocked,
  };
}
