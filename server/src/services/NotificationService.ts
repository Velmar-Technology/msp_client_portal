import { Ticket, User } from '../types';
import { sendTicketStatusEmail } from '../utils/emailService';
import { sendTicketStatusWhatsApp } from '../utils/whatsappService';
import { logger } from '../utils/logger';

/**
 * Notification Service — Orchestrates multi-channel notifications.
 * Delegates to email and WhatsApp utility services.
 * Notifications are fire-and-forget: they should never break the main flow.
 */
export class NotificationService {
  /**
   * Notify client when a new ticket is created.
   */
  async onTicketCreated(ticket: Ticket, client: User): Promise<void> {
    try {
      await sendTicketStatusEmail(
        client.email,
        ticket.id,
        'OPEN',
        `Your ticket "${ticket.title}" has been received and is being processed.`,
      );
    } catch (error) {
      logger.error('Failed to send ticket creation notification', { ticketId: ticket.id, error });
    }
  }

  /**
   * Notify client when ticket status changes.
   */
  async onTicketStatusChanged(ticket: Ticket, client: User, notes?: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      IN_PROGRESS: 'Your device is now being processed by our team.',
      AWAITING_PAYMENT: 'Your device is awaiting payment before we can proceed.',
      RESOLVED: 'Your issue has been resolved. Please confirm and close the ticket.',
      CLOSED: 'Your ticket has been closed. Thank you for using our service.',
      CANCELLED: 'Your ticket has been cancelled.',
    };

    const message = statusMessages[ticket.status] || `Status updated to: ${ticket.status}`;
    const fullNotes = notes ? `${message}\n\nNotes: ${notes}` : message;

    try {
      // Send email notification
      await sendTicketStatusEmail(client.email, ticket.id, ticket.status, fullNotes);

      // Send WhatsApp notification (stub)
      await sendTicketStatusWhatsApp(client.email, ticket.id, ticket.status, fullNotes);
    } catch (error) {
      logger.error('Failed to send status change notification', {
        ticketId: ticket.id,
        status: ticket.status,
        error,
      });
    }
  }

  /**
   * Notify technician when a ticket is assigned to them.
   */
  async onTicketAssigned(ticket: Ticket, technician: User): Promise<void> {
    try {
      await sendTicketStatusEmail(
        technician.email,
        ticket.id,
        'ASSIGNED',
        `A new ticket "${ticket.title}" has been assigned to you. Category: ${ticket.category}, Priority: ${ticket.priority}.`,
      );
    } catch (error) {
      logger.error('Failed to send assignment notification', { ticketId: ticket.id, error });
    }
  }
}

export const notificationService = new NotificationService();
