import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '@shared/config/env';
import { JwtPayload, UserContext, UserRole } from '@shared/types';
import { logger } from '@shared/utils/logger';
import { ticketRepository, TicketRepository } from '../repositories/TicketRepository';
import { ticketAccessPolicy, TicketAccessPolicy } from '@shared/policies/TicketAccessPolicy';

export interface TicketChatMessagePayload {
  id: string;
  ticketId: string;
  userId?: string;
  authorName: string;
  authorRole: string;
  isAgentAuthored?: boolean;
  message: string;
  attachments?: Array<{ id: string; filename: string; path?: string }>;
  createdAt: string;
  isInternal?: boolean;
}

/**
 * WebSocket Gateway managing real-time chat streaming for web portal users viewing TicketDetailPage.
 * Multiplexes connections into ticket rooms to broadcast new conversational responses.
 */
export class TicketStreamGateway {
  private ticketRooms = new Map<string, Set<WebSocket>>();
  private socketToTickets = new Map<WebSocket, Set<string>>();

  constructor(
    private ticketRepo: TicketRepository = ticketRepository,
    private accessPol: TicketAccessPolicy = ticketAccessPolicy,
  ) {}

  /**
   * Initializes the gateway with a WebSocketServer instance.
   *
   * @param wss - WebSocketServer instance dedicated to /portal-ws
   */
  init(wss: WebSocketServer): void {
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    logger.info('[TicketStreamGateway] Initialized portal WebSocket stream server', {
      service: 'msp-services',
    });
  }

  /**
   * Handles incoming WebSocket connection, authenticates JWT, and subscribes to ticket room.
   *
   * @param ws - Client WebSocket
   * @param req - HTTP upgrade request with query params
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url || '', `http://${host}`);
      const token = url.searchParams.get('token') || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
      const ticketId = url.searchParams.get('ticketId');

      if (!token) {
        ws.close(4001, 'Unauthorized: Missing token');
        return;
      }

      // Verify JWT authentication
      let user: JwtPayload;
      try {
        user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      } catch {
        ws.close(4001, 'Unauthorized: Invalid token');
        return;
      }

      const userCtx: UserContext = {
        userId: user.userId,
        tenantId: user.tenantId,
        role: user.role as UserRole,
      };

      if (!ticketId) {
        ws.close(4002, 'Bad Request: Missing ticketId');
        return;
      }

      // Authorize access to initial ticket
      const ticket = await this.ticketRepo.findById(ticketId);
      if (!ticket) {
        ws.close(4004, 'Not Found: Ticket does not exist');
        return;
      }

      try {
        this.accessPol.assertReadAccess(ticket, userCtx);
      } catch {
        ws.close(4003, 'Forbidden: Insufficient permissions for ticket');
        return;
      }

      // Register socket in ticket room
      this.subscribe(ticketId, ws);

      logger.info(`[TicketStreamGateway] Client ${user.userId} (${user.role}) joined ticket room ${ticketId}`, {
        service: 'msp-services',
        ticketId,
        userId: user.userId,
      });

      // Send connection acknowledgment frame
      ws.send(
        JSON.stringify({
          type: 'SUBSCRIBED',
          ticketId,
          timestamp: new Date().toISOString(),
        })
      );

      // Handle ping/pong heartbeat and incoming client commands
      ws.on('message', async (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          } else if (parsed.type === 'JOIN_TICKET' && parsed.ticketId) {
            const nextTicket = await this.ticketRepo.findById(parsed.ticketId);
            if (!nextTicket) {
              ws.send(JSON.stringify({ type: 'ERROR', error: 'Ticket not found' }));
              return;
            }
            try {
              this.accessPol.assertReadAccess(nextTicket, userCtx);
              this.subscribe(parsed.ticketId, ws);
              ws.send(JSON.stringify({ type: 'SUBSCRIBED', ticketId: parsed.ticketId }));
            } catch {
              ws.send(JSON.stringify({ type: 'ERROR', error: 'Forbidden: Insufficient ticket permissions' }));
            }
          }
        } catch {
          // Ignore malformed client frames
        }
      });

      ws.on('close', () => {
        this.unsubscribeAll(ws);
      });

      ws.on('error', (err) => {
        logger.warn(`[TicketStreamGateway] Socket error on ticket ${ticketId}: ${err.message}`, {
          service: 'msp-services',
        });
        this.unsubscribeAll(ws);
      });
    } catch (err) {
      logger.error('[TicketStreamGateway] Unhandled error in connection handler', {
        service: 'msp-services',
        error: err instanceof Error ? err.message : String(err),
      });
      ws.close(1011, 'Internal Server Error');
    }
  }

  /**
   * Subscribes a WebSocket to a ticket room.
   *
   * @param ticketId - UUID of ticket
   * @param ws - WebSocket client
   */
  subscribe(ticketId: string, ws: WebSocket): void {
    if (!this.ticketRooms.has(ticketId)) {
      this.ticketRooms.set(ticketId, new Set());
    }
    this.ticketRooms.get(ticketId)!.add(ws);

    if (!this.socketToTickets.has(ws)) {
      this.socketToTickets.set(ws, new Set());
    }
    this.socketToTickets.get(ws)!.add(ticketId);
  }

  /**
   * Unsubscribes a socket from all ticket rooms upon disconnect.
   *
   * @param ws - WebSocket client
   */
  unsubscribeAll(ws: WebSocket): void {
    const tickets = this.socketToTickets.get(ws);
    if (tickets) {
      for (const tId of tickets) {
        const room = this.ticketRooms.get(tId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.ticketRooms.delete(tId);
          }
        }
      }
      this.socketToTickets.delete(ws);
    }
  }

  /**
   * Broadcasts a new chat message frame to all clients viewing the specified ticket.
   *
   * @param ticketId - Target ticket UUID
   * @param payload - Formatted message details
   */
  broadcastToTicket(ticketId: string, payload: TicketChatMessagePayload): void {
    const room = this.ticketRooms.get(ticketId);
    if (!room || room.size === 0) {
      return;
    }

    const frame = JSON.stringify({
      type: 'TICKET_CHAT_PUSH',
      payload,
    });

    for (const ws of room) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frame);
      }
    }
  }

  /**
   * Returns active subscriber count for a ticket room (useful for testing/observability).
   *
   * @param ticketId - Target ticket UUID
   * @returns Number of connected clients in room
   */
  getSubscriberCount(ticketId: string): number {
    return this.ticketRooms.get(ticketId)?.size ?? 0;
  }
}

export const ticketStreamGateway = new TicketStreamGateway();
