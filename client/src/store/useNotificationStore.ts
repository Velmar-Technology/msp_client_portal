import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { notificationService } from "@/services/notificationService";
import type { Notification } from "@/services/notificationService";
import { toast } from 'sonner';
import { getAuthItem } from '@/lib/authStorage';

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  eventSource: EventSource | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  
  startStream: () => void;
  stopStream: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      eventSource: null,

      fetchNotifications: async () => {
        set({ isLoading: true }, false, 'notifications/fetch_request');
        try {
          const result = await notificationService.getAll();
          set(
            {
              notifications: result.data.notifications,
              unreadCount: result.data.unreadCount,
              isLoading: false,
            },
            false,
            'notifications/fetch_success'
          );
        } catch (error) {
          set({ isLoading: false }, false, 'notifications/fetch_failure');
          console.error('Failed to fetch notifications:', error);
        }
      },

      markAsRead: async (id) => {
        try {
          await notificationService.markAsRead(id);
          set(
            (state) => {
              const updatedNotifications = state.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              );
              const unreadCount = updatedNotifications.filter((n) => !n.read).length;
              return {
                notifications: updatedNotifications,
                unreadCount,
              };
            },
            false,
            'notifications/mark_as_read'
          );
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      },

      markAllAsRead: async () => {
        try {
          await notificationService.markAllAsRead();
          set(
            (state) => {
              const updatedNotifications = state.notifications.map((n) => ({ ...n, read: true }));
              return {
                notifications: updatedNotifications,
                unreadCount: 0,
              };
            },
            false,
            'notifications/mark_all_as_read'
          );
        } catch (error) {
          console.error('Failed to mark all notifications as read:', error);
        }
      },

      clearNotifications: async () => {
        try {
          await notificationService.clearAll();
          set(
            { notifications: [], unreadCount: 0 },
            false,
            'notifications/clear_all'
          );
        } catch (error) {
          console.error('Failed to clear notifications:', error);
        }
      },



      startStream: () => {
        const { eventSource } = get();
        if (eventSource) return; // Stream already running

        const token = getAuthItem('accessToken');
        if (!token) return;

        // Use absolute path for SSE connection, letting Vite proxy forward it
        const url = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);

        es.addEventListener('notification', (e: MessageEvent) => {
          try {
            const newNotif = JSON.parse(e.data) as Notification;
            
            // 1. Add notification to local store state
            set((state) => {
              // Avoid duplicates
              const exists = state.notifications.some((n) => n.id === newNotif.id);
              if (exists) return state;

              const updatedNotifications = [newNotif, ...state.notifications];
              return {
                notifications: updatedNotifications,
                unreadCount: updatedNotifications.filter((n) => !n.read).length,
              };
            }, false, 'notifications/stream_received');

            // 2. Generate a premium Toast message for the client in real-time
            // Map types to beautiful labels and color variants
            let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';
            if (newNotif.type.includes('SUCCESS') || newNotif.type === 'TICKET_CREATED' || newNotif.type === 'RESOLVED') {
              toastType = 'success';
            } else if (newNotif.type.includes('ERROR') || newNotif.type.includes('FAIL') || newNotif.type === 'TICKET_CANCELLED') {
              toastType = 'error';
            } else if (newNotif.type.includes('WARNING') || newNotif.type === 'AWAITING_PAYMENT') {
              toastType = 'warning';
            }

            const options: { description: string; action?: { label: string; onClick: () => void } } = {
              description: newNotif.message,
            };

            if (newNotif.link) {
              options.action = {
                label: 'View',
                onClick: () => {
                  window.location.href = newNotif.link!;
                },
              };
            }

            if (toastType === 'success') {
              toast.success(newNotif.title, options);
            } else if (toastType === 'error') {
              toast.error(newNotif.title, options);
            } else if (toastType === 'warning') {
              toast.warning(newNotif.title, options);
            } else {
              toast.info(newNotif.title, options);
            }

          } catch (err) {
            console.error('Error parsing SSE event data:', err);
          }
        });

        es.addEventListener('error', async (e) => {
          console.warn('SSE connection encountered an error, attempting to reconnect...', e);
          es.close();
          set({ eventSource: null }, false, 'notifications/stream_error');

          try {
            // Trigger a call to fetch notifications. This uses the Axios 'api' instance.
            // If the current token is expired, Axios interceptors will auto-refresh it in the background.
            await notificationService.getAll();
          } catch (error) {
            console.error('Failed to trigger token auto-refresh during SSE reconnect:', error);
          }

          // Retry connection after 5 seconds if still authenticated
          setTimeout(() => {
            const token = getAuthItem('accessToken');
            const currentES = get().eventSource;
            if (token && !currentES) {
              get().startStream();
            }
          }, 5000);
        });

        set({ eventSource: es }, false, 'notifications/stream_start');
      },

      stopStream: () => {
        const { eventSource } = get();
        if (eventSource) {
          eventSource.close();
          set({ eventSource: null }, false, 'notifications/stream_stop');
        }
      },
    }),
    { name: 'NotificationStore' }
  )
);
