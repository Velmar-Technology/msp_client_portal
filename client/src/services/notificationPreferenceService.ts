import api from './api';

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

export const notificationPreferenceService = {
  async getPreferences(): Promise<GetPreferencesResponse> {
    const response = await api.get('/notification-preferences');
    return response.data;
  },

  async updatePreferences(preferences: NotificationPreferencesMap): Promise<UpdatePreferencesResponse> {
    const response = await api.put('/notification-preferences', { preferences });
    return response.data;
  },
};
