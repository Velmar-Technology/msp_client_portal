import api from './api';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  ticket_id: string | null;
  type: string;
  read: boolean;
  metadata: Record<string, any> | null;
  tenant_id: string;
  created_at: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    unreadCount: number;
  };
}

export const notificationService = {
  async getAll(): Promise<GetNotificationsResponse> {
    const response = await api.get('/notifications');
    return response.data;
  },

  async markAsRead(id: string): Promise<{ success: boolean; data: Notification }> {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<{ success: boolean; data: { count: number } }> {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  async clearAll(): Promise<{ success: boolean; data: { count: number } }> {
    const response = await api.delete('/notifications');
    return response.data;
  },
};
