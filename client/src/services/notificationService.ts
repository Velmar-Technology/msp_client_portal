import api from "@/services/api";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  ticket_id: string | null;
  type: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
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

/**
 * In-app notification service.
 * Manages notification retrieval, read acknowledgments, and bulk clearing.
 */
export const notificationService = {
  /**
   * Retrieves all notifications and unread counter for the current user.
   *
   * @returns Promise resolving to GetNotificationsResponse.
   */
  async getAll(): Promise<GetNotificationsResponse> {
    const response = await api.get('/notifications');
    return response.data;
  },

  /**
   * Marks a specific notification as read.
   *
   * @param id - Notification UUID.
   * @returns Promise resolving to updated notification entity.
   */
  async markAsRead(id: string): Promise<{ success: boolean; data: Notification }> {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Marks all unread notifications as read for the user.
   *
   * @returns Promise resolving to number of updated records.
   */
  async markAllAsRead(): Promise<{ success: boolean; data: { count: number } }> {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  /**
   * Clears and deletes all notifications from the user's tray.
   *
   * @returns Promise resolving to number of cleared records.
   */
  async clearAll(): Promise<{ success: boolean; data: { count: number } }> {
    const response = await api.delete('/notifications');
    return response.data;
  },
};
