import api from "@/services/api";

export interface ChannelPreference {
  in_app: boolean;
  email: boolean;
  whatsapp: boolean;
}

export type NotificationEventType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_CANCELLED'
  | 'NEW_REPLY';

export type NotificationPreferencesMap = Record<NotificationEventType, ChannelPreference>;

export interface GetPreferencesResponse {
  success: boolean;
  data: {
    preferences: NotificationPreferencesMap;
  };
}

export interface UpdatePreferencesResponse {
  success: boolean;
  data: {
    preferences: NotificationPreferencesMap;
  };
}

/**
 * User notification channel preference service (in-app, email, WhatsApp per event type).
 */
export const notificationPreferenceService = {
  /**
   * Retrieves the current user's multi-channel notification preferences.
   *
   * @returns Promise resolving to GetPreferencesResponse.
   */
  async getPreferences(): Promise<GetPreferencesResponse> {
    const response = await api.get('/notification-preferences');
    return response.data;
  },

  /**
   * Updates multi-channel notification preferences for the user.
   *
   * @param preferences - Map of event types to enabled channels (in_app, email, whatsapp).
   * @returns Promise resolving to UpdatePreferencesResponse.
   */
  async updatePreferences(preferences: NotificationPreferencesMap): Promise<UpdatePreferencesResponse> {
    const response = await api.put('/notification-preferences', { preferences });
    return response.data;
  },
};
