import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketStreamGateway } from './TicketStreamGateway';
import { WebSocket } from 'ws';

describe('TicketStreamGateway', () => {
  let gateway: TicketStreamGateway;

  const createMockSocket = (readyState = WebSocket.OPEN) => {
    return {
      readyState,
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    } as unknown as WebSocket;
  };

  beforeEach(() => {
    gateway = new TicketStreamGateway();
  });

  it('subscribes a socket to a ticket room and updates subscriber count', () => {
    const ws = createMockSocket();
    gateway.subscribe('ticket-123', ws);

    expect(gateway.getSubscriberCount('ticket-123')).toBe(1);
    expect(gateway.getSubscriberCount('ticket-456')).toBe(0);
  });

  it('broadcasts messages to all active sockets in the ticket room', () => {
    const ws1 = createMockSocket(WebSocket.OPEN);
    const ws2 = createMockSocket(WebSocket.OPEN);
    const wsOther = createMockSocket(WebSocket.OPEN);

    gateway.subscribe('ticket-123', ws1);
    gateway.subscribe('ticket-123', ws2);
    gateway.subscribe('ticket-456', wsOther);

    const payload = {
      id: 'resp-1',
      ticketId: 'ticket-123',
      authorName: 'Dan Worker',
      authorRole: 'CLIENT',
      message: 'Hello support team',
      createdAt: new Date().toISOString(),
    };

    gateway.broadcastToTicket('ticket-123', payload);

    expect(ws1.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'TICKET_CHAT_PUSH', payload })
    );
    expect(ws2.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'TICKET_CHAT_PUSH', payload })
    );
    expect(wsOther.send).not.toHaveBeenCalled();
  });

  it('does not attempt to send to closed sockets', () => {
    const wsClosed = createMockSocket(WebSocket.CLOSED);
    gateway.subscribe('ticket-123', wsClosed);

    gateway.broadcastToTicket('ticket-123', {
      id: 'resp-2',
      ticketId: 'ticket-123',
      authorName: 'Support',
      authorRole: 'TECHNICIAN',
      message: 'Can you see this?',
      createdAt: new Date().toISOString(),
    });

    expect(wsClosed.send).not.toHaveBeenCalled();
  });

  it('unsubscribes a socket from all rooms on disconnect', () => {
    const ws = createMockSocket();
    gateway.subscribe('ticket-1', ws);
    gateway.subscribe('ticket-2', ws);

    expect(gateway.getSubscriberCount('ticket-1')).toBe(1);
    expect(gateway.getSubscriberCount('ticket-2')).toBe(1);

    gateway.unsubscribeAll(ws);

    expect(gateway.getSubscriberCount('ticket-1')).toBe(0);
    expect(gateway.getSubscriberCount('ticket-2')).toBe(0);
  });

  it('rejects connection if token is missing', async () => {
    const ws = createMockSocket();
    const req = {
      headers: {},
      url: '/portal-ws?ticketId=ticket-1',
    } as any;

    // Call private handleConnection through reflection
    await (gateway as any).handleConnection(ws, req);

    expect(ws.close).toHaveBeenCalledWith(4001, expect.stringContaining('Missing token'));
  });

  it('rejects connection if ticketId is missing', async () => {
    const ws = createMockSocket();
    const req = {
      headers: { authorization: 'Bearer test-token' },
      url: '/portal-ws',
    } as any;

    await (gateway as any).handleConnection(ws, req);

    expect(ws.close).toHaveBeenCalledWith(4001, expect.stringContaining('Invalid token'));
  });
});
