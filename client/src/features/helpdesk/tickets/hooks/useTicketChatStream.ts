import { useEffect, useRef } from 'react';
import { getAuthItem } from '@/lib/authStorage';
import type { TicketResponseItem } from '../api/ticketService';

interface UseTicketChatStreamOptions {
  ticketId: string | undefined;
  onNewMessage: (message: TicketResponseItem) => void;
  enabled?: boolean;
}

/**
 * Custom hook providing a real-time WebSocket connection to /portal-ws for a ticket.
 * Automatically receives server push events when new replies are submitted by either
 * support staff or endpoint workstation users (msp-tray).
 *
 * @param options - Hook configuration (ticketId, onNewMessage handler, enabled flag)
 */
export function useTicketChatStream({
  ticketId,
  onNewMessage,
  enabled = true,
}: UseTicketChatStreamOptions): void {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isMountedRef = useRef(true);

  // Keep latest callback in ref to avoid re-triggering connection on closure changes
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!ticketId || !enabled) {
      return;
    }

    const connect = () => {
      if (!isMountedRef.current) return;

      const token = getAuthItem('accessToken');
      if (!token) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/portal-ws?ticketId=${encodeURIComponent(ticketId)}&token=${encodeURIComponent(token)}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts.current = 0;
          // Set up ping heartbeat every 20s
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TICKET_CHAT_PUSH' && data.payload) {
              const p = data.payload;
              if (p.ticketId === ticketId) {
                const messageItem: TicketResponseItem = {
                  id: p.id || `ws-${Date.now()}`,
                  ticket_id: p.ticketId,
                  user_id: p.userId || '',
                  message: p.message,
                  tenant_id: p.tenantId || '',
                  created_at: p.createdAt || new Date().toISOString(),
                  user_name: p.authorName || 'Support User',
                  user_role: p.authorRole || 'CLIENT',
                  author_name: p.isAgentAuthored ? p.authorName : null,
                  authorName: p.isAgentAuthored ? p.authorName : null,
                  is_internal: Boolean(p.isInternal),
                  isInternal: Boolean(p.isInternal),
                  attachments: (p.attachments || []).map((a: { id?: string; filename: string; path?: string }) => ({
                    id: a.id || `att-${Date.now()}`,
                    filename: a.filename,
                    path: a.path || '',
                  })),
                };
                onNewMessageRef.current(messageItem);
              }
            }
          } catch {
            // Ignore malformed push messages
          }
        };

        ws.onclose = () => {
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (!isMountedRef.current) return;

          // Reconnect with exponential backoff (max 15s)
          const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 15000);
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // WebSocket initialization failure
      }
    };

    connect();

    return () => {
      isMountedRef.current = false;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [ticketId, enabled]);
}
