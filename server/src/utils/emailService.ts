import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';
import { NotificationPayload } from '../types';

/**
 * Email service using Nodemailer.
 * In development/when SMTP is not configured, logs emails to console instead.
 */

let transporter: nodemailer.Transporter;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (env.SMTP_USER && env.SMTP_PASSWORD) {
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASSWORD,
        },
      });
    } else {
      // Stub transporter for development — logs to console
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      logger.warn('📧 Email service running in STUB mode — emails will be logged, not sent');
    }
  }
  return transporter;
}

export async function sendEmail(payload: NotificationPayload): Promise<void> {
  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: `"MSP Help Desk" <${env.SMTP_USER || 'noreply@msp-helpdesk.com'}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
    });

    if (env.SMTP_USER && env.SMTP_PASSWORD) {
      logger.info('📧 Email sent successfully', {
        to: payload.to,
        subject: payload.subject,
        messageId: info.messageId,
      });
    } else {
      logger.debug('📧 [STUB] Email logged', {
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
      });
    }
  } catch (error) {
    logger.error('📧 Failed to send email', {
      to: payload.to,
      subject: payload.subject,
      error,
    });
    // Don't throw — notifications should not break the main flow
  }
}

/**
 * Send a ticket status update email to the client.
 */
export async function sendTicketStatusEmail(
  clientEmail: string,
  ticketId: string,
  newStatus: string,
  notes?: string,
): Promise<void> {
  await sendEmail({
    to: clientEmail,
    subject: `Ticket Update — ${ticketId}`,
    body: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F172A;">MSP Help Desk — Ticket Update</h2>
        <p>Your ticket <strong>${ticketId}</strong> has been updated.</p>
        <div style="background: #F1F5F9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>New Status:</strong> ${newStatus}</p>
          ${notes ? `<p style="margin: 8px 0 0;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        <p style="color: #64748B; font-size: 12px;">
          This is an automated message from MSP Help Desk. Do not reply directly to this email.
        </p>
      </div>
    `,
    ticketId,
    type: 'EMAIL',
  });
}
