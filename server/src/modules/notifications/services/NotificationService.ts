import { Ticket, User, Subscription, Notification, NotificationEventType } from '@shared/types';
import { 
  sendTicketCreatedEmail, 
  sendTicketStatusChangedEmail, 
  sendTicketAssignedEmail,
  sendTicketResponseEmail,
  sendSubscriptionExpiringEmail
} from '@shared/utils/emailService';
import { sendTicketStatusWhatsApp } from '@shared/utils/whatsappService';
import { logger } from '@shared/utils/logger';
import { notificationRepository, NotificationRepository } from '@modules/notifications/repositories/NotificationRepository';
import { notificationPreferenceService, NotificationPreferenceService } from '@modules/notifications/services/NotificationPreferenceService';

/**
 * Interface representing a downstream SSE response stream.
 * Decouples the domain notification service from Express.
 */
export interface SSEClientStream {
  writeHead?(statusCode: number, headers: Record<string, string>): void;
  write(chunk: string): boolean | void;
  on(event: 'close' | string, listener: () => void): this | void;
}

/**
 * Notification Service — Orchestrates multi-channel (email, WhatsApp, in-app SSE) delivery
 * across ticket lifecycle, billing renewal warnings, and user notification preference evaluations.
 */
export class NotificationService {
  // In-memory registry of active SSE connections: userId -> SSEClientStream[]
  private sseClients = new Map<string, SSEClientStream[]>();

  /**
   * Initializes NotificationService with repository and preference service dependencies.
   *
   * @param notificationRepo - In-app notification repository
   * @param preferenceSvc - User notification preferences service
   */
  constructor(
    private notificationRepo: NotificationRepository = notificationRepository,
    private preferenceSvc: NotificationPreferenceService = notificationPreferenceService,
  ) {}

  /**
   * Registers a user's SSE connection for live real-time notification streaming and portal presence.
   *
   * @param userId - User UUID
   * @param res - Downstream SSE response stream
   */
  registerSSEClient(userId: string, res: SSEClientStream): void {
    // Configure headers for SSE
    if (res.writeHead) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in Nginx if applicable
      });
    }

    // Send initial handshake
    res.write('retry: 10000\n');
    res.write('event: connected\ndata: {"status":"ok"}\n\n');

    // Add to active clients list
    if (!this.sseClients.has(userId)) {
      this.sseClients.set(userId, []);
    }
    this.sseClients.get(userId)!.push(res);

    logger.debug(`SSE Client registered for user ${userId}. Total active streams: ${this.sseClients.get(userId)!.length}`);

    // Ping heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 30000);

    // Clean up on disconnect
    res.on('close', () => {
      clearInterval(heartbeat);
      const userResList = this.sseClients.get(userId);
      if (userResList) {
        const filtered = userResList.filter((client) => client !== res);
        if (filtered.length === 0) {
          this.sseClients.delete(userId);
          logger.debug(`SSE Client completely disconnected for user ${userId}`);
        } else {
          this.sseClients.set(userId, filtered);
          logger.debug(`SSE Client closed one tab for user ${userId}. Remaining tabs: ${filtered.length}`);
        }
      }
    });
  }

  /**
   * Queries the IDs of users with at least one live SSE connection (portal presence).
   *
   * @returns Array of user UUIDs currently connected
   */
  getConnectedUserIds(): string[] {
    return [...this.sseClients.keys()];
  }

  /**
   * Pushes real-time SSE event to all connected browser tabs for a user.
   *
   * @param userId - User UUID
   * @param event - SSE event name
   * @param data - Payload data object
   */
  private sendRealTimeUpdate(userId: string, event: string, data: any): void {
    const clients = this.sseClients.get(userId);
    if (clients && clients.length > 0) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      clients.forEach((client) => {
        try {
          client.write(payload);
        } catch (err) {
          logger.error(`Error writing to SSE stream for user ${userId}`, err);
        }
      });
    }
  }

  /**
   * Creates an in-app notification record and broadcasts it over SSE to active sessions.
   *
   * @param data - In-app notification creation payload
   * @returns Created Notification entity or null on error
   */
  async createInAppNotification(data: {
    userId: string;
    title: string;
    message: string;
    link?: string;
    ticketId?: string;
    type: string;
    metadata?: Record<string, any>;
    tenantId: string;
  }): Promise<Notification | null> {
    try {
      const notification = await this.notificationRepo.create({
        user_id: data.userId,
        title: data.title,
        message: data.message,
        link: data.link,
        ticket_id: data.ticketId,
        type: data.type,
        metadata: data.metadata,
        tenant_id: data.tenantId,
      });

      // Stream the notification event to the client if online
      this.sendRealTimeUpdate(data.userId, 'notification', notification);

      return notification;
    } catch (error) {
      logger.error('Failed to create in-app notification', { userId: data.userId, error });
      return null;
    }
  }

  /**
   * Dispatches notifications (email and in-app) when a new ticket is opened.
   *
   * @param ticket - Created Ticket entity
   * @param client - Client User entity
   */
  async onTicketCreated(ticket: Ticket, client: User): Promise<void> {
    const eventType: NotificationEventType = 'TICKET_CREATED';

    // 1. Send Email Notification (if user allows it)
    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'email')) {
      try {
        await sendTicketCreatedEmail(client.email, client.name, ticket, client.language || 'en_US');
      } catch (error) {
        logger.error('Failed to send ticket creation notification email', { ticketId: ticket.id, error });
      }
    }

    // 2. Send In-App Notification to the client (if user allows it)
    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'in_app')) {
      await this.createInAppNotification({
        userId: client.id,
        title: 'Ticket Created successfully',
        message: `Your ticket "${ticket.title}" has been opened. Ref: ${ticket.id.substring(0, 8)}`,
        link: `/tickets/${ticket.id}`,
        ticketId: ticket.id,
        type: 'TICKET_CREATED',
        tenantId: ticket.tenant_id,
      });
    }

    // 3. Send In-App Notification to the assigned technician (if auto-assigned)
    if (ticket.assigned_tech_id) {
      const assignEventType: NotificationEventType = 'TICKET_ASSIGNED';
      if (await this.preferenceSvc.shouldNotify(ticket.assigned_tech_id, assignEventType, 'in_app')) {
        await this.createInAppNotification({
          userId: ticket.assigned_tech_id,
          title: 'New Ticket Auto-Assigned',
          message: `Ticket "${ticket.title}" (Priority: ${ticket.priority}) has been auto-assigned to you.`,
          link: `/tickets/${ticket.id}`,
          ticketId: ticket.id,
          type: 'TICKET_ASSIGNED',
          tenantId: ticket.tenant_id,
        });
      }
    }
  }

  /**
   * Dispatches notifications (email, WhatsApp, in-app) when ticket status changes.
   *
   * @param ticket - Updated Ticket entity
   * @param client - Client User entity
   * @param notes - Optional status transition notes
   */
  async onTicketStatusChanged(ticket: Ticket, client: User, notes?: string): Promise<void> {
    const eventType: NotificationEventType = 'TICKET_STATUS_CHANGED';
    const statusMessages: Record<string, string> = {
      IN_PROGRESS: 'Your device is now being processed by our team.',
      AWAITING_PAYMENT: 'Your device is awaiting payment before we can proceed.',
      RESOLVED: 'Your issue has been resolved. Please confirm and close the ticket.',
      CLOSED: 'Your ticket has been closed. Thank you for using our service.',
      CANCELLED: 'Your ticket has been cancelled.',
    };

    const defaultMsg = statusMessages[ticket.status] || `Status updated to: ${ticket.status}`;
    const combinedNotes = notes ? `${defaultMsg}\n\nNotes: ${notes}` : defaultMsg;

    // 1. Email & WhatsApp (check preferences per channel)
    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'email')) {
      try {
        await sendTicketStatusChangedEmail(
          client.email,
          client.name,
          ticket,
          combinedNotes,
          client.language || 'en_US',
        );
      } catch (error) {
        logger.error('Failed to send status change email notification', {
          ticketId: ticket.id,
          status: ticket.status,
          error,
        });
      }
    }

    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'whatsapp')) {
      try {
        await sendTicketStatusWhatsApp(client.email, ticket.id, ticket.status, combinedNotes);
      } catch (error) {
        logger.error('Failed to send status change whatsapp notification', {
          ticketId: ticket.id,
          status: ticket.status,
          error,
        });
      }
    }

    // 2. In-App Notification to Client
    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'in_app')) {
      await this.createInAppNotification({
        userId: client.id,
        title: `Ticket Status: ${ticket.status}`,
        message: `Your ticket "${ticket.title}" status is now ${ticket.status}. ${notes ? `(${notes})` : ''}`,
        link: `/tickets/${ticket.id}`,
        ticketId: ticket.id,
        type: 'TICKET_STATUS_CHANGED',
        tenantId: ticket.tenant_id,
      });
    }

    // 3. In-App Notification to Assigned Technician (if ticket was cancelled by client)
    if (ticket.status === 'CANCELLED' && ticket.assigned_tech_id) {
      const cancelEventType: NotificationEventType = 'TICKET_CANCELLED';
      if (await this.preferenceSvc.shouldNotify(ticket.assigned_tech_id, cancelEventType, 'in_app')) {
        await this.createInAppNotification({
          userId: ticket.assigned_tech_id,
          title: 'Ticket Cancelled by Client',
          message: `Ticket "${ticket.title}" assigned to you has been cancelled by the customer.`,
          link: `/tickets/${ticket.id}`,
          ticketId: ticket.id,
          type: 'TICKET_CANCELLED',
          tenantId: ticket.tenant_id,
        });
      }
    }
  }

  /**
   * Dispatches email and in-app notifications when a ticket is assigned to a technician.
   *
   * @param ticket - Assigned Ticket entity
   * @param technician - Assigned technician User entity
   */
  async onTicketAssigned(ticket: Ticket, technician: User): Promise<void> {
    const eventType: NotificationEventType = 'TICKET_ASSIGNED';

    // 1. Email
    if (await this.preferenceSvc.shouldNotify(technician.id, eventType, 'email')) {
      try {
        await sendTicketAssignedEmail(
          technician.email,
          technician.name,
          ticket,
          technician.language || 'en_US',
        );
      } catch (error) {
        logger.error('Failed to send assignment notification email', { ticketId: ticket.id, error });
      }
    }

    // 2. In-App Notification
    if (await this.preferenceSvc.shouldNotify(technician.id, eventType, 'in_app')) {
      await this.createInAppNotification({
        userId: technician.id,
        title: 'Ticket Assigned',
        message: `Ticket "${ticket.title}" (Priority: ${ticket.priority}) has been assigned to you.`,
        link: `/tickets/${ticket.id}`,
        ticketId: ticket.id,
        type: 'TICKET_ASSIGNED',
        tenantId: ticket.tenant_id,
      });
    }
  }

  /**
   * Dispatches email and in-app notifications when a response message is added to a ticket thread.
   *
   * @param ticket - Ticket entity
   * @param recipient - Recipient User entity
   * @param senderName - Display name of the responder
   * @param message - Message response body
   */
  async onTicketResponseCreated(ticket: Ticket, recipient: User, senderName: string, message: string): Promise<void> {
    const eventType: NotificationEventType = 'NEW_REPLY';

    // 1. Email
    if (await this.preferenceSvc.shouldNotify(recipient.id, eventType, 'email')) {
      try {
        await sendTicketResponseEmail(
          recipient.email,
          recipient.name,
          senderName,
          ticket,
          message,
          recipient.language || 'en_US',
        );
      } catch (error) {
        logger.error('Failed to send ticket response notification email', { ticketId: ticket.id, error });
      }
    }

    // 2. In-App Notification
    if (await this.preferenceSvc.shouldNotify(recipient.id, eventType, 'in_app')) {
      const shortMessage = message.length > 80 ? message.substring(0, 80) + '...' : message;
      await this.createInAppNotification({
        userId: recipient.id,
        title: `New Reply from ${senderName}`,
        message: `"${shortMessage}" on ticket: ${ticket.title}`,
        link: `/tickets/${ticket.id}`,
        ticketId: ticket.id,
        type: 'NEW_REPLY',
        tenantId: ticket.tenant_id,
      });
    }
  }

  /**
   * Dispatches email and in-app advance warning notifications when a subscription renewal is due in 7 days.
   *
   * @param subscription - Subscription entity
   * @param client - Client User entity
   */
  async onSubscriptionExpiringSoon(subscription: Subscription, client: User): Promise<void> {
    const eventType: NotificationEventType = 'SUBSCRIPTION_EXPIRING_SOON';
    const renewalDateStr = new Date(subscription.renewal_date).toLocaleDateString();

    // 1. Email
    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'email')) {
      try {
        await sendSubscriptionExpiringEmail(
          client.email,
          client.name,
          subscription.service_name,
          subscription.renewal_date,
          client.language || 'en_US',
        );
      } catch (error) {
        logger.error('Failed to send subscription expiry warning email', { subscriptionId: subscription.id, error });
      }
    }

    // 2. In-App Notification
    if (await this.preferenceSvc.shouldNotify(client.id, eventType, 'in_app')) {
      await this.createInAppNotification({
        userId: client.id,
        title: 'Subscription Expiring Soon',
        message: `Your subscription to ${subscription.service_name} expires on ${renewalDateStr}. Renew now to avoid service interruption.`,
        link: '/plans',
        type: 'SUBSCRIPTION_EXPIRING_SOON',
        tenantId: subscription.tenant_id,
        metadata: {
          subscriptionId: subscription.id,
          renewalDate: subscription.renewal_date,
          serviceName: subscription.service_name,
        },
      });
    }
  }

  /**
   * Retrieves chronological in-app notifications for a user.
   *
   * @param userId - User UUID
   * @returns Array of Notification entities
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.findByUser(userId);
  }

  /**
   * Retrieves count of unread notifications for a user.
   *
   * @param userId - User UUID
   * @returns Unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.getUnreadCount(userId);
  }

  /**
   * Marks a specific in-app notification as read.
   *
   * @param id - Notification UUID
   * @param userId - User UUID
   * @returns Updated Notification entity or null
   */
  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    return this.notificationRepo.markAsRead(id, userId);
  }

  /**
   * Marks all unread in-app notifications for a user as read.
   *
   * @param userId - User UUID
   * @returns Number of marked notifications
   */
  async markAllAsRead(userId: string): Promise<number> {
    return this.notificationRepo.markAllAsRead(userId);
  }

  /**
   * Deletes all in-app notifications for a user.
   *
   * @param userId - User UUID
   * @returns Number of deleted notifications
   */
  async clearAllForUser(userId: string): Promise<number> {
    return this.notificationRepo.deleteAllForUser(userId);
  }
}

export const notificationService = new NotificationService();
