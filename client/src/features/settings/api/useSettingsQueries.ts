import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationPreferenceService,
  type NotificationPreferencesMap,
} from './notificationPreferenceService';

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for Settings & Preferences.
 */
export const SETTINGS_QUERY_KEYS = {
  all: ['settings'] as const,
  preferences: () => [...SETTINGS_QUERY_KEYS.all, 'preferences'] as const,
};

export function useNotificationPreferencesQuery() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEYS.preferences(),
    queryFn: () => notificationPreferenceService.getPreferences(),
  });
}

export function useUpdateNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferencesMap) =>
      notificationPreferenceService.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEYS.preferences() });
    },
  });
}
