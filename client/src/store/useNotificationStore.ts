import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { notificationService } from '../services/notificationService';
import type { Notification } from '../services/notificationService';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string | null;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  toasts: ToastMessage[];
  isLoading: boolean;
  eventSource: EventSource | null;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  
  startStream: () => void;
  stopStream: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      toasts: [],
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

      addToast: (toastData) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: ToastMessage = { ...toastData, id };
        
        set(
          (state) => ({ toasts: [...state.toasts, newToast] }),
          false,
          'notifications/add_toast'
        );

        // Auto-remove toast after 6 seconds
        setTimeout(() => {
          get().removeToast(id);
        }, 6000);

        return id;
      },

      removeToast: (id) => {
        set(
          (state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }),
          false,
          'notifications/remove_toast'
        );
      },

      startStream: () => {
        const { eventSource } = get();
        if (eventSource) return; // Stream already running

        const token = localStorage.getItem('accessToken');
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

            get().addToast({
              title: newNotif.title,
              message: newNotif.message,
              type: toastType,
              link: newNotif.link,
            });

          } catch (err) {
            console.error('Error parsing SSE event data:', err);
          }
        });

        es.addEventListener('error', (e) => {
          console.warn('SSE connection encountered an error, reconnecting...', e);
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
