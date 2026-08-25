import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TicketReadState {
  // Mapping of userId -> { ticketId: timestamp (milliseconds) }
  readTicketsByUser: Record<string, Record<string, number>>;
  markAsRead: (ticketId: string, userId?: string) => void;
  markAsUnread: (ticketId: string, userId?: string) => void;
  markAllAsRead: (ticketIds: string[], userId?: string) => void;
  isTicketRead: (ticketId: string, userId?: string) => boolean;
}

const DEFAULT_USER_KEY = "anonymous";

export const useTicketReadStore = create<TicketReadState>()(
  persist(
    (set, get) => ({
      readTicketsByUser: {},

      markAsRead: (ticketId: string, userId?: string) => {
        const userKey = userId || DEFAULT_USER_KEY;
        const currentByUser = get().readTicketsByUser;
        const userReads = currentByUser[userKey] || {};

        if (userReads[ticketId]) return; // Already marked as read

        set({
          readTicketsByUser: {
            ...currentByUser,
            [userKey]: {
              ...userReads,
              [ticketId]: Date.now(),
            },
          },
        });
      },

      markAsUnread: (ticketId: string, userId?: string) => {
        const userKey = userId || DEFAULT_USER_KEY;
        const currentByUser = get().readTicketsByUser;
        const userReads = { ...(currentByUser[userKey] || {}) };

        delete userReads[ticketId];

        set({
          readTicketsByUser: {
            ...currentByUser,
            [userKey]: userReads,
          },
        });
      },

      markAllAsRead: (ticketIds: string[], userId?: string) => {
        const userKey = userId || DEFAULT_USER_KEY;
        const currentByUser = get().readTicketsByUser;
        const userReads = { ...(currentByUser[userKey] || {}) };
        const now = Date.now();

        ticketIds.forEach((id) => {
          userReads[id] = now;
        });

        set({
          readTicketsByUser: {
            ...currentByUser,
            [userKey]: userReads,
          },
        });
      },

      isTicketRead: (ticketId: string, userId?: string) => {
        const userKey = userId || DEFAULT_USER_KEY;
        const userReads = get().readTicketsByUser[userKey];
        return Boolean(userReads && userReads[ticketId]);
      },
    }),
    {
      name: "msp_ticket_read_store",
    }
  )
);
