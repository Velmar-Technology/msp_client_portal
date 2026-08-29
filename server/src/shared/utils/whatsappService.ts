import { logger } from './logger';
import { NotificationPayload } from '@shared/types';

/**
 * WhatsApp notification service — STUB implementation.
 *
 * This is a placeholder ready for integration with:
 * - Twilio WhatsApp API
 * - Meta WhatsApp Business Platform
 * - Other WhatsApp Business Solution Providers
 *
 * Replace the sendWhatsApp function body with the real API call.
 */

/**
 * Dispatches a WhatsApp notification payload through gateway or logs stub in development.
 *
 * @param payload - NotificationPayload containing phone number, subject, and message text
 */
export async function sendWhatsApp(payload: NotificationPayload): Promise<void> {
  // STUB: Log the message instead of sending in development/stub environment.
  logger.info('📱 [STUB] WhatsApp message queued', {
    to: payload.to,
    subject: payload.subject,
    body: payload.body.substring(0, 100) + '...',
    ticketId: payload.ticketId,
  });
}

/**
 * Sends a ticket status change alert via WhatsApp message.
 *
 * @param phoneNumber - Recipient phone number / MSISDN
 * @param ticketId - Ticket UUID
 * @param newStatus - Updated status string
 * @param notes - Optional remarks
 */
export async function sendTicketStatusWhatsApp(
  phoneNumber: string,
  ticketId: string,
  newStatus: string,
  notes?: string,
): Promise<void> {
  const message = [
    `🔔 *Velmar Technology SRL — Ticket Update*`,
    ``,
    `Ticket: *${ticketId}*`,
    `New Status: *${newStatus}*`,
    notes ? `Notes: ${notes}` : '',
    ``,
    `_This is an automated message._`,
  ]
    .filter(Boolean)
    .join('\n');

  await sendWhatsApp({
    to: phoneNumber,
    subject: `Ticket Update — ${ticketId}`,
    body: message,
    ticketId,
    type: 'WHATSAPP',
  });
}

/**
 * Sends an OTP account verification code via WhatsApp message.
 *
 * @param phoneNumber - Recipient phone number
 * @param otp - 6-digit OTP string
 */
export async function sendOTPWhatsApp(
  phoneNumber: string,
  otp: string
): Promise<void> {
  const message = [
    `🔐 *Velmar Technology SRL — Account Verification*`,
    ``,
    `Your verification code is: *${otp}*`,
    ``,
    `This code will expire in 15 minutes. Please do not share this code with anyone.`,
    ``,
    `_This is an automated message._`,
  ].join('\n');

  await sendWhatsApp({
    to: phoneNumber,
    subject: 'Account Verification OTP',
    body: message,
    type: 'WHATSAPP',
  });
}

