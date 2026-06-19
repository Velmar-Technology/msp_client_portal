import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';
import { NotificationPayload, Ticket } from '../types';

/**
 * Email service using Nodemailer.
 * In development/when SMTP is not configured, logs emails to console instead.
 */

const isSMTPConfigured =
  !!env.SMTP_USER &&
  !!env.SMTP_PASSWORD &&
  env.SMTP_USER !== 'your_email@gmail.com' &&
  env.SMTP_PASSWORD !== 'your_app_password';

let transporter: nodemailer.Transporter;
let useStubTransporter = !isSMTPConfigured;

if (isSMTPConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });

    // Asynchronously verify connection on startup so we don't block server initialization
    transporter.verify()
      .then(() => {
        logger.info('📧 SMTP connection verified successfully!');
      })
      .catch((error) => {
        logger.error('📧 SMTP connection verification failed. Falling back to STUB mode for emails.', {
          error: error.message || error,
        });
        useStubTransporter = true;
      });
  } catch (error) {
    logger.error('📧 Failed to initialize SMTP transporter. Falling back to STUB mode.', error);
    useStubTransporter = true;
  }
} else {
  logger.warn('📧 Email service running in STUB mode — emails will be logged, not sent (SMTP not configured or using placeholders)');
}

function getTransporter(): nodemailer.Transporter {
  if (useStubTransporter || !transporter) {
    // Stub transporter for development — logs to console
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }
  return transporter;
}

export async function sendEmail(payload: NotificationPayload): Promise<void> {
  const transport = getTransporter();
  const usingSMTP = !useStubTransporter;

  try {
    const info = await transport.sendMail({
      from: `"MSP Help Desk" <${usingSMTP ? env.SMTP_USER : 'noreply@msp-helpdesk.com'}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.body,
    });

    if (usingSMTP) {
      logger.info('📧 Email sent successfully', {
        to: payload.to,
        subject: payload.subject,
        messageId: info.messageId,
      });
    } else {
      logger.info('📧 [STUB] Email logged', {
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

    // If SMTP sending failed, fall back to stub mode to prevent blocking future emails
    if (usingSMTP) {
      logger.warn('📧 Falling back to STUB mode for subsequent emails due to send failure');
      useStubTransporter = true;

      // Log the current failed email as a stub so it's visible in console
      logger.info('📧 [STUB FALLBACK] Email logged due to SMTP send failure', {
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
      });
    }
  }
}

/**
 * Generates a unified, responsive, and highly aesthetic HTML wrapper for emails.
 * Uses inline styling for robust cross-client compatibility.
 */
function getEmailLayout(
  preheader: string,
  title: string,
  contentHtml: string,
  actionUrl?: string,
  actionText?: string
): string {
  const brandColor = '#4F46E5'; // Indigo-600
  const actionButton = actionUrl && actionText ? `
    <div style="margin: 32px 0 16px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="${brandColor}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${actionText}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${actionUrl}" style="background-color: ${brandColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.15); transition: background-color 0.2s ease;">
        ${actionText}
      </a>
      <!--<![endif]-->
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all;">
        ${preheader}
      </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);">
              <!-- Header Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 36px 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">MSP Help Desk</h1>
                  <p style="color: #94A3B8; margin: 6px 0 0 0; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${title}</p>
                </td>
              </tr>
              <!-- Content Body -->
              <tr>
                <td style="padding: 40px 32px; line-height: 1.6; font-size: 15px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${contentHtml}
                  ${actionButton}
                </td>
              </tr>
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #F1F5F9; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <p style="margin: 0; color: #64748B; font-size: 12px; font-weight: 500;">This is an automated notification from the MSP Client Portal.</p>
                  <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px;">Do not reply directly to this email.</p>
                  <p style="margin: 12px 0 0 0; color: #64748B; font-size: 12px; font-weight: 500;">© ${new Date().getFullYear()} MSP Help Desk. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send a ticket creation welcome email to the client.
 */
export async function sendTicketCreatedEmail(
  clientEmail: string,
  clientName: string,
  ticket: Ticket,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `Your ticket "${ticket.title}" has been successfully created.`;
  
  const priorityColors = {
    LOW: { bg: '#F1F5F9', text: '#475569' },
    MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
    HIGH: { bg: '#FEE2E2', text: '#991B1B' },
    CRITICAL: { bg: '#FCA5A5', text: '#7F1D1D' },
  };
  const priColor = priorityColors[ticket.priority] || { bg: '#F1F5F9', text: '#475569' };

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Hello ${clientName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      We have received your support request and successfully opened a ticket. Our engineering team has been notified, and a technician will begin diagnosing your request shortly.
    </p>
    
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #1E293B; font-size: 16px; font-weight: 700; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
        Ticket Specifications
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 120px; font-weight: 500;">Ticket ID:</td>
          <td style="padding: 6px 0; color: #0F172A; font-family: monospace;">${ticket.id}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Title:</td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Category:</td>
          <td style="padding: 6px 0; color: #0F172A;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: #E2E8F0; color: #334155; text-transform: uppercase;">
              ${ticket.category}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Priority:</td>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: ${priColor.bg}; color: ${priColor.text}; text-transform: uppercase;">
              ${ticket.priority}
            </span>
          </td>
        </tr>
      </table>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0; color: #64748B; font-weight: 600; font-size: 13px;">Problem Description:</p>
        <p style="margin: 6px 0 0 0; color: #334155; font-size: 14px; white-space: pre-line; line-height: 1.5;">${ticket.description}</p>
      </div>
    </div>
  `;

  const body = getEmailLayout(preheader, 'Ticket Successfully Opened', contentHtml, portalUrl, 'Track Ticket in Client Portal');

  await sendEmail({
    to: clientEmail,
    subject: `Ticket Opened: ${ticket.title} (Ref: ${ticket.id.substring(0, 8)})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Send a ticket status update email to the client with comments/notes.
 */
export async function sendTicketStatusChangedEmail(
  clientEmail: string,
  clientName: string,
  ticket: Ticket,
  notes?: string,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `Your ticket "${ticket.title}" status has been updated to ${ticket.status}.`;

  const statusColors = {
    OPEN: { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' },
    IN_PROGRESS: { bg: '#E0E7FF', text: '#3730A3', label: 'In Progress' },
    AWAITING_PAYMENT: { bg: '#FEF3C7', text: '#92400E', label: 'Awaiting Payment' },
    RESOLVED: { bg: '#D1FAE5', text: '#065F46', label: 'Resolved' },
    CLOSED: { bg: '#F1F5F9', text: '#475569', label: 'Closed' },
    CANCELLED: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
  };
  const stColor = statusColors[ticket.status] || { bg: '#E2E8F0', text: '#334155', label: ticket.status };

  let contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Hello ${clientName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      The status of your support ticket has been updated.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 120px; font-weight: 500;">Ticket Title:</td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Current Status:</td>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 700; background-color: ${stColor.bg}; color: ${stColor.text};">
              ${stColor.label}
            </span>
          </td>
        </tr>
      </table>
  `;

  if (notes) {
    contentHtml += `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0 0 8px 0; color: #475569; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
          Technician Remarks:
        </p>
        <div style="background-color: #ffffff; border-left: 4px solid #4F46E5; padding: 14px 18px; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px; font-style: italic; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); border-top: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
          ${notes.replace(/\n/g, '<br />')}
        </div>
      </div>
    `;
  }

  contentHtml += `</div>`;

  const body = getEmailLayout(preheader, `Status Update: ${stColor.label}`, contentHtml, portalUrl, 'Review Ticket & History');

  await sendEmail({
    to: clientEmail,
    subject: `Ticket Status Update [${stColor.label}]: ${ticket.title} (Ref: ${ticket.id.substring(0, 8)})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Send a ticket assignment notification email to the technician.
 */
export async function sendTicketAssignedEmail(
  technicianEmail: string,
  technicianName: string,
  ticket: Ticket,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `A new ticket "${ticket.title}" has been assigned to you.`;

  const priorityColors = {
    LOW: { bg: '#F1F5F9', text: '#475569' },
    MEDIUM: { bg: '#FEF3C7', text: '#92400E' },
    HIGH: { bg: '#FEE2E2', text: '#991B1B' },
    CRITICAL: { bg: '#FCA5A5', text: '#7F1D1D' },
  };
  const priColor = priorityColors[ticket.priority] || { bg: '#F1F5F9', text: '#475569' };

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Hello ${technicianName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      You have been assigned to the following support ticket. Please review the customer requirements and SLA windows before starting work.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #1E293B; font-size: 16px; font-weight: 700; margin-top: 0; margin-bottom: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
        Work Specifications
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 120px; font-weight: 500;">Ticket ID:</td>
          <td style="padding: 6px 0; color: #0F172A; font-family: monospace;">${ticket.id}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Title:</td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Client:</td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.client_name || 'Client'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Client Email:</td>
          <td style="padding: 6px 0; color: #0F172A; font-family: monospace;">${ticket.client_email || 'No email'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Category:</td>
          <td style="padding: 6px 0; color: #0F172A;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: #E2E8F0; color: #334155; text-transform: uppercase;">
              ${ticket.category}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Priority:</td>
          <td style="padding: 6px 0;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: ${priColor.bg}; color: ${priColor.text}; text-transform: uppercase;">
              ${ticket.priority}
            </span>
          </td>
        </tr>
      </table>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0; color: #64748B; font-weight: 600; font-size: 13px;">Customer Description:</p>
        <p style="margin: 6px 0 0 0; color: #334155; font-size: 14px; white-space: pre-line; line-height: 1.5;">${ticket.description}</p>
      </div>
    </div>
  `;

  const body = getEmailLayout(preheader, 'New Ticket Assignment', contentHtml, portalUrl, 'Access Technician Dashboard');

  await sendEmail({
    to: technicianEmail,
    subject: `[New Assignment] ${ticket.title} (Priority: ${ticket.priority})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Send a ticket status update email to the client (legacy fallback).
 */
export async function sendTicketStatusEmail(
  clientEmail: string,
  ticketId: string,
  newStatus: string,
  notes?: string,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticketId}`;
  const preheader = `Your ticket update for ${ticketId}`;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Ticket Status Updated</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      Your ticket <strong>${ticketId}</strong> has been updated.
    </p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #334155;"><strong>New Status:</strong> ${newStatus}</p>
      ${notes ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #334155; font-style: italic; border-left: 3px solid #E2E8F0; padding-left: 12px;">${notes}</p>` : ''}
    </div>
  `;

  const body = getEmailLayout(preheader, 'Ticket Update', contentHtml, portalUrl, 'View Ticket');

  await sendEmail({
    to: clientEmail,
    subject: `Ticket Update — ${ticketId}`,
    body,
    ticketId,
    type: 'EMAIL',
  });
}

/**
 * Send a notification when a new response is added to a ticket.
 */
export async function sendTicketResponseEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  ticket: Ticket,
  message: string,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `${senderName} replied to ticket "${ticket.title}".`;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Hello ${recipientName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      A new response has been added to your support ticket by <strong>${senderName}</strong>.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 120px; font-weight: 500;">Ticket Title:</td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
        </tr>
      </table>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0 0 8px 0; color: #475569; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
          New Message:
        </p>
        <div style="background-color: #ffffff; border-left: 4px solid #4F46E5; padding: 14px 18px; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02); border-top: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
          ${message.replace(/\n/g, '<br />')}
        </div>
      </div>
    </div>
  `;

  const body = getEmailLayout(preheader, `New Reply on Ticket`, contentHtml, portalUrl, 'View Ticket & Reply');

  await sendEmail({
    to: recipientEmail,
    subject: `[New Reply] ${ticket.title} (Ref: ${ticket.id.substring(0, 8)})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

