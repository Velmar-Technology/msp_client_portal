import { describe, it, expect, beforeEach } from 'vitest';
import { useTicketReadStore } from './useTicketReadStore';

describe('useTicketReadStore', () => {
  beforeEach(() => {
    useTicketReadStore.setState({ readTicketsByUser: {} });
    localStorage.clear();
  });

  it('marks a ticket as read for a given user', () => {
    const { markAsRead, isTicketRead } = useTicketReadStore.getState();
    const userId = 'user-123';
    const ticketId = 'ticket-456';

    expect(isTicketRead(ticketId, userId)).toBe(false);

    markAsRead(ticketId, userId);

    expect(useTicketReadStore.getState().isTicketRead(ticketId, userId)).toBe(true);
  });

  it('handles reading for anonymous / undefined user gracefully', () => {
    const { markAsRead, isTicketRead } = useTicketReadStore.getState();
    const ticketId = 'ticket-anonymous';

    expect(isTicketRead(ticketId)).toBe(false);

    markAsRead(ticketId);

    expect(useTicketReadStore.getState().isTicketRead(ticketId)).toBe(true);
  });

  it('isolates read states across different users', () => {
    const { markAsRead, isTicketRead } = useTicketReadStore.getState();
    const userA = 'user-a';
    const userB = 'user-b';
    const ticketId = 'ticket-common';

    markAsRead(ticketId, userA);

    expect(useTicketReadStore.getState().isTicketRead(ticketId, userA)).toBe(true);
    expect(useTicketReadStore.getState().isTicketRead(ticketId, userB)).toBe(false);
  });

  it('can mark a ticket as unread', () => {
    const { markAsRead, markAsUnread, isTicketRead } = useTicketReadStore.getState();
    const userId = 'user-1';
    const ticketId = 'ticket-1';

    markAsRead(ticketId, userId);
    expect(useTicketReadStore.getState().isTicketRead(ticketId, userId)).toBe(true);

    markAsUnread(ticketId, userId);
    expect(useTicketReadStore.getState().isTicketRead(ticketId, userId)).toBe(false);
  });

  it('can mark all tickets as read in bulk', () => {
    const { markAllAsRead, isTicketRead } = useTicketReadStore.getState();
    const userId = 'user-bulk';
    const ticketIds = ['ticket-1', 'ticket-2', 'ticket-3'];

    expect(isTicketRead('ticket-1', userId)).toBe(false);
    expect(isTicketRead('ticket-2', userId)).toBe(false);
    expect(isTicketRead('ticket-3', userId)).toBe(false);

    markAllAsRead(ticketIds, userId);

    expect(useTicketReadStore.getState().isTicketRead('ticket-1', userId)).toBe(true);
    expect(useTicketReadStore.getState().isTicketRead('ticket-2', userId)).toBe(true);
    expect(useTicketReadStore.getState().isTicketRead('ticket-3', userId)).toBe(true);
  });
});
