import nodemailer from 'nodemailer';
import { env } from '@shared/config/env';
import { logger } from './logger';
import { NotificationPayload, Ticket, Plan, Invoice } from '@shared/types';

/**
 * ─────────────────────────────────────────────────────────────
 *  Velmar Technology — Server Email Service & Design System
 * ─────────────────────────────────────────────────────────────
 *
 *  Homogeneous, responsive, cross-client HTML email rendering
 *  aligned with the client design tokens in @/email-templates/tokens.ts.
 */

/* ── Brand Palette & Tokens ───────────────────────────────── */
const palette = {
  brand:          '#0C4A6E',   // Deep ocean-blue
  brandLight:     '#0369A1',   // Mid-tone accent
  brandAccent:    '#38BDF8',   // Sky highlight
  cta:            '#2563EB',   // Action-blue (buttons, links)
  white:          '#FFFFFF',
  surface:        '#F8FAFC',   // Email body background
  cardBg:         '#FFFFFF',   // Content card
  infoBg:         '#F1F5F9',   // Info-box background
  border:         '#E2E8F0',   // Universal divider / card border
  muted:          '#94A3B8',   // Timestamps, disclaimers
  secondary:      '#64748B',   // Labels, helper text
  body:           '#334155',   // Main paragraph text
  heading:        '#0F172A',   // Headings
  headingAlt:     '#1E293B',   // Card headers
  success:        '#16A34A',
  successBg:      '#F0FDF4',
  warning:        '#D97706',
  warningBg:      '#FFFBEB',
  danger:         '#DC2626',
  dangerBg:       '#FEF2F2',
  priorityLow:      { bg: '#F1F5F9', text: '#475569' },
  priorityMedium:   { bg: '#FEF3C7', text: '#92400E' },
  priorityHigh:     { bg: '#FEE2E2', text: '#991B1B' },
  priorityCritical: { bg: '#FCA5A5', text: '#7F1D1D' },
};

function getPriorityColor(priority: string): { bg: string; text: string } {
  const key = (priority || '').toUpperCase();
  if (key === 'LOW') return palette.priorityLow;
  if (key === 'MEDIUM') return palette.priorityMedium;
  if (key === 'HIGH') return palette.priorityHigh;
  if (key === 'CRITICAL') return palette.priorityCritical;
  return palette.priorityLow;
}

/* ── SMTP Transporter Initialization ──────────────────────── */
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

    transporter.verify()
      .then(() => {
        logger.info('SMTP connection verified successfully!');
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
    return nodemailer.createTransport({
      jsonTransport: true,
    });
  }
  return transporter;
}

/**
 * Sends a transactional email through Nodemailer SMTP or logs payload when running in stub mode.
 *
 * @param payload - NotificationPayload containing recipient, subject, and HTML body
 */
export async function sendEmail(payload: NotificationPayload): Promise<void> {
  const transport = getTransporter();
  const usingSMTP = !useStubTransporter;

  try {
    const info = await transport.sendMail({
      from: `"Velmar Technology SRL" <${usingSMTP ? env.SMTP_USER : 'noreply@velmartech.com.do'}>`,
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
      });
    }
  } catch (error) {
    logger.error('📧 Failed to send email', {
      to: payload.to,
      subject: payload.subject,
      error,
    });

    if (usingSMTP) {
      logger.warn('📧 Falling back to STUB mode for subsequent emails due to send failure');
      useStubTransporter = true;
      logger.info('📧 [STUB FALLBACK] Email logged due to SMTP send failure', {
        to: payload.to,
        subject: payload.subject,
        body: payload.body,
      });
    }
  }
}

/* ── HTML Layout Wrapper ──────────────────────────────────── */
interface EmailLayoutOptions {
  preheader: string;
  title: string;
  contentHtml: string;
  actionUrl?: string;
  actionText?: string;
  headerIcon?: string;
  accentColor?: string;
  language?: string;
}

function getEmailLayout(options: EmailLayoutOptions): string;
function getEmailLayout(
  preheader: string,
  title: string,
  contentHtml: string,
  actionUrl?: string,
  actionText?: string,
): string;
function getEmailLayout(
  arg1: string | EmailLayoutOptions,
  arg2?: string,
  arg3?: string,
  arg4?: string,
  arg5?: string,
): string {
  let opts: EmailLayoutOptions;
  if (typeof arg1 === 'object') {
    opts = arg1;
  } else {
    opts = {
      preheader: arg1,
      title: arg2 || '',
      contentHtml: arg3 || '',
      actionUrl: arg4,
      actionText: arg5,
    };
  }

  const isSpanish = (opts.language || 'en_US').startsWith('es');
  const accentColor = opts.accentColor || palette.brandAccent;
  const headerIconSpan = opts.headerIcon ? `<span style="margin-right: 8px;">${opts.headerIcon}</span>` : '';

  const actionButton = opts.actionUrl && opts.actionText ? `
    <div style="margin: 32px 0 16px 0; text-align: center;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${opts.actionUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="${palette.cta}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${opts.actionText}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${opts.actionUrl}" style="background-color: ${palette.cta}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.20); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${opts.actionText}
      </a>
      <!--<![endif]-->
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="${isSpanish ? 'es' : 'en'}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${opts.title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; color: #F8FAFC;">
        ${opts.preheader}
        ${'&zwnj;&nbsp;'.repeat(40)}
      </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);">
              <!-- Header Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #0C4A6E 0%, #064E73 50%, #0C4A6E 100%); padding: 36px 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Velmar Technology</h1>
                  <p style="color: #38BDF8; margin: 8px 0 0 0; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${headerIconSpan}${opts.title}</p>
                </td>
              </tr>
              <!-- Accent Bar -->
              <tr>
                <td style="height: 3px; background-color: ${accentColor}; font-size: 0; line-height: 0;">&nbsp;</td>
              </tr>
              <!-- Content Body -->
              <tr>
                <td style="padding: 40px 32px; line-height: 1.6; font-size: 15px; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${opts.contentHtml}
                  ${actionButton}
                </td>
              </tr>
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #F1F5F9; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <p style="margin: 0; color: #64748B; font-size: 12px; font-weight: 500;">
                    ${isSpanish ? 'Esta es una notificación automática del Portal MSP de Velmar.' : 'This is an automated notification from the Velmar MSP Portal.'}
                  </p>
                  <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px;">
                    ${isSpanish ? 'No responda directamente a este correo electrónico.' : 'Do not reply directly to this email.'}
                  </p>
                  <p style="margin: 12px 0 0 0; color: #64748B; font-size: 12px; font-weight: 500;">
                    © ${new Date().getFullYear()} Velmar Technology SRL. ${isSpanish ? 'Todos los derechos reservados.' : 'All rights reserved.'}
                  </p>
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

/* ── HTML Helper Primitives ───────────────────────────────── */
function renderInfoCard(title: string, innerHtml: string, accentColor: string = palette.cta): string {
  return `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="height: 3px; background-color: ${accentColor}; font-size: 0; line-height: 0;">&nbsp;</div>
      <div style="padding: 16px 20px 10px 20px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="color: #1E293B; font-size: 16px; font-weight: 700; margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${title}
        </h3>
      </div>
      <div style="padding: 20px;">
        ${innerHtml}
      </div>
    </div>
  `;
}

function renderBadge(text: string, bg: string, color: string): string {
  return `
    <span style="display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background-color: ${bg}; color: ${color}; text-transform: uppercase; letter-spacing: 0.03em;">
      ${text}
    </span>
  `;
}

function renderCallout(text: string, variant: 'warning' | 'danger' | 'info' = 'warning'): string {
  const configs = {
    warning: { bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', icon: '⚠️' },
    danger:  { bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', icon: '🔒' },
    info:    { bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', icon: 'ℹ️' },
  };
  const cfg = configs[variant];
  return `
    <div style="background-color: ${cfg.bg}; border: 1px solid ${cfg.border}; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 13px; color: ${cfg.color}; line-height: 1.5;">
      <span style="margin-right: 8px;">${cfg.icon}</span> ${text}
    </div>
  `;
}

function renderDisclaimer(text: string): string {
  return `
    <p style="font-size: 12px; color: #94A3B8; margin-top: 24px; margin-bottom: 0; line-height: 1.5;">
      ${text}
    </p>
  `;
}

/* ── Transactional Email Senders ──────────────────────────── */

/**
 * Sends a ticket creation welcome email to the client containing ticket metadata.
 *
 * @param clientEmail - Recipient email address
 * @param clientName - Recipient display name
 * @param ticket - Created Ticket entity
 */
export async function sendTicketCreatedEmail(
  clientEmail: string,
  clientName: string,
  ticket: Ticket,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `Your ticket "${ticket.title}" has been successfully created.`;
  const priColor = getPriorityColor(ticket.priority);

  const cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 130px; font-weight: 500;">Ticket ID:</td>
        <td style="padding: 6px 0; color: #0F172A; font-family: monospace;">${ticket.id}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Title:</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Category:</td>
        <td style="padding: 6px 0;">${renderBadge(ticket.category, '#E2E8F0', '#334155')}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Priority:</td>
        <td style="padding: 6px 0;">${renderBadge(ticket.priority, priColor.bg, priColor.text)}</td>
      </tr>
    </table>
    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
      <p style="margin: 0; color: #64748B; font-weight: 600; font-size: 13px;">Problem Description:</p>
      <p style="margin: 6px 0 0 0; color: #334155; font-size: 14px; white-space: pre-line; line-height: 1.5;">${ticket.description}</p>
    </div>
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Hello ${clientName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      We have received your support request and successfully opened a ticket. Our engineering team has been notified, and a technician will begin diagnosing your request shortly.
    </p>
    ${renderInfoCard('Ticket Details', cardHtml, palette.brandLight)}
    ${renderDisclaimer('You will receive automatic notifications as your ticket progresses.')}
  `;

  const body = getEmailLayout({
    preheader,
    title: 'Ticket Successfully Opened',
    headerIcon: '🎫',
    accentColor: palette.brandLight,
    contentHtml,
    actionUrl: portalUrl,
    actionText: 'Track Ticket in Portal',
  });

  await sendEmail({
    to: clientEmail,
    subject: `Ticket Opened: ${ticket.title} (Ref: ${ticket.id.substring(0, 8)})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Sends a ticket status update notification email to the client with optional notes.
 *
 * @param clientEmail - Recipient email address
 * @param clientName - Recipient display name
 * @param ticket - Updated Ticket entity
 * @param notes - Optional status transition notes from technician
 */
export async function sendTicketStatusChangedEmail(
  clientEmail: string,
  clientName: string,
  ticket: Ticket,
  notes?: string,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `Your ticket "${ticket.title}" status has been updated to ${ticket.status}.`;

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    OPEN: { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' },
    IN_PROGRESS: { bg: '#E0E7FF', text: '#3730A3', label: 'In Progress' },
    AWAITING_PAYMENT: { bg: '#FEF3C7', text: '#92400E', label: 'Awaiting Payment' },
    RESOLVED: { bg: '#D1FAE5', text: '#065F46', label: 'Resolved' },
    RESOLVED_AUTOMATED: { bg: '#D1FAE5', text: '#065F46', label: 'Resolved Automatically' },
    CLOSED: { bg: '#F1F5F9', text: '#475569', label: 'Closed' },
    CANCELLED: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
  };
  const stColor = statusColors[ticket.status] || { bg: '#E2E8F0', text: '#334155', label: ticket.status };

  let cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 130px; font-weight: 500;">Ticket Title:</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Current Status:</td>
        <td style="padding: 6px 0;">${renderBadge(stColor.label, stColor.bg, stColor.text)}</td>
      </tr>
    </table>
  `;

  if (notes) {
    cardHtml += `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0 0 8px 0; color: #475569; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
          Technician Remarks:
        </p>
        <div style="background-color: #ffffff; border-left: 4px solid #0369A1; padding: 14px 18px; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px; font-style: italic; border-top: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
          ${notes.replace(/\n/g, '<br />')}
        </div>
      </div>
    `;
  }

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Hello ${clientName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      The status of your support ticket has been updated.
    </p>
    ${renderInfoCard('Status Details', cardHtml, palette.brandLight)}
    ${renderDisclaimer('You can reply to this ticket directly from the client portal.')}
  `;

  const body = getEmailLayout({
    preheader,
    title: `Status Update: ${stColor.label}`,
    headerIcon: '🔄',
    accentColor: palette.brandLight,
    contentHtml,
    actionUrl: portalUrl,
    actionText: 'Review Ticket & History',
  });

  await sendEmail({
    to: clientEmail,
    subject: `Ticket Status Update [${stColor.label}]: ${ticket.title} (Ref: ${ticket.id.substring(0, 8)})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Sends a ticket assignment notification email to the assigned technician.
 *
 * @param technicianEmail - Technician email address
 * @param technicianName - Technician display name
 * @param ticket - Assigned Ticket entity
 */
export async function sendTicketAssignedEmail(
  technicianEmail: string,
  technicianName: string,
  ticket: Ticket,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticket.id}`;
  const preheader = `A new ticket "${ticket.title}" has been assigned to you.`;
  const priColor = getPriorityColor(ticket.priority);

  const cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 130px; font-weight: 500;">Ticket ID:</td>
        <td style="padding: 6px 0; color: #0F172A; font-family: monospace;">${ticket.id}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Title:</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Client:</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.client_name || 'Client'}${ticket.client_email ? ` (${ticket.client_email})` : ''}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Category:</td>
        <td style="padding: 6px 0;">${renderBadge(ticket.category, '#E2E8F0', '#334155')}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">Priority:</td>
        <td style="padding: 6px 0;">${renderBadge(ticket.priority, priColor.bg, priColor.text)}</td>
      </tr>
    </table>
    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
      <p style="margin: 0; color: #64748B; font-weight: 600; font-size: 13px;">Customer Description:</p>
      <p style="margin: 6px 0 0 0; color: #334155; font-size: 14px; white-space: pre-line; line-height: 1.5;">${ticket.description}</p>
    </div>
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Hello ${technicianName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      You have been assigned to the following support ticket. Please review the customer requirements and SLA windows before starting work.
    </p>
    ${renderInfoCard('Work Specifications', cardHtml, palette.brandLight)}
  `;

  const body = getEmailLayout({
    preheader,
    title: 'New Ticket Assignment',
    headerIcon: '👤',
    accentColor: palette.brandLight,
    contentHtml,
    actionUrl: portalUrl,
    actionText: 'Access Technician Dashboard',
  });

  await sendEmail({
    to: technicianEmail,
    subject: `[New Assignment] ${ticket.title} (Priority: ${ticket.priority})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Sends a ticket status update email to the client (legacy fallback).
 *
 * @param clientEmail - Recipient email address
 * @param ticketId - Ticket UUID
 * @param newStatus - New ticket status string
 * @param notes - Optional status transition notes
 */
export async function sendTicketStatusEmail(
  clientEmail: string,
  ticketId: string,
  newStatus: string,
  notes?: string,
): Promise<void> {
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/tickets/${ticketId}`;
  const preheader = `Your ticket update for ${ticketId}`;

  const cardHtml = `
    <p style="margin: 0; font-size: 14px; color: #334155;"><strong>New Status:</strong> ${newStatus}</p>
    ${notes ? `<p style="margin: 12px 0 0 0; font-size: 14px; color: #334155; font-style: italic; border-left: 3px solid #E2E8F0; padding-left: 12px;">${notes}</p>` : ''}
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Ticket Status Updated</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      Your ticket <strong>${ticketId}</strong> has been updated.
    </p>
    ${renderInfoCard('Ticket Update', cardHtml, palette.brandLight)}
  `;

  const body = getEmailLayout({
    preheader,
    title: 'Ticket Update',
    headerIcon: '🔄',
    accentColor: palette.brandLight,
    contentHtml,
    actionUrl: portalUrl,
    actionText: 'View Ticket',
  });

  await sendEmail({
    to: clientEmail,
    subject: `Ticket Update — ${ticketId}`,
    body,
    ticketId,
    type: 'EMAIL',
  });
}

/**
 * Sends a notification email when a new response is posted to a ticket thread.
 *
 * @param recipientEmail - Recipient email address
 * @param recipientName - Recipient display name
 * @param senderName - Sender display name
 * @param ticket - Ticket entity
 * @param message - New reply message body
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

  const cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 16px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 130px; font-weight: 500;">Ticket Title:</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${ticket.title}</td>
      </tr>
    </table>
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
      <p style="margin: 0 0 8px 0; color: #475569; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
        New Message:
      </p>
      <div style="background-color: #ffffff; border-left: 4px solid #0369A1; padding: 14px 18px; border-radius: 0 8px 8px 0; color: #334155; font-size: 14px; border-top: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
        ${message.replace(/\n/g, '<br />')}
      </div>
    </div>
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">Hello ${recipientName},</h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      A new response has been added to your support ticket by <strong>${senderName}</strong>.
    </p>
    ${renderInfoCard('Ticket Reply', cardHtml, palette.brandLight)}
  `;

  const body = getEmailLayout({
    preheader,
    title: 'New Reply on Ticket',
    headerIcon: '💬',
    accentColor: palette.brandLight,
    contentHtml,
    actionUrl: portalUrl,
    actionText: 'View Ticket & Reply',
  });

  await sendEmail({
    to: recipientEmail,
    subject: `[New Reply] ${ticket.title} (Ref: ${ticket.id.substring(0, 8)})`,
    body,
    ticketId: ticket.id,
    type: 'EMAIL',
  });
}

/**
 * Sends a plan quotation estimate email to the prospective client.
 *
 * @param clientEmail - Recipient email address
 * @param clientName - Recipient display name
 * @param plan - Quoted Plan entity
 * @param billingCycle - Billing cadence ('monthly' | 'annual')
 * @param equipmentCount - Number of covered devices
 * @param subtotal - Subtotal amount
 * @param tax - Tax amount
 * @param total - Total price
 * @param language - Recipient language code (e.g., 'es_DO', 'en_US')
 */
export async function sendQuotationEmail(
  clientEmail: string,
  clientName: string,
  plan: Plan,
  billingCycle: 'monthly' | 'annual',
  equipmentCount: number,
  subtotal: number,
  tax: number,
  total: number,
  language: string,
): Promise<void> {
  const isSpanish = language.startsWith('es');
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/plans`;

  const getLocalizedValue = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    const resolvedLang = isSpanish ? 'es_DO' : 'en_US';
    if (val[resolvedLang]) return val[resolvedLang];
    if (val['en_US']) return val['en_US'];
    const keys = Object.keys(val);
    if (keys.length > 0) return val[keys[0]];
    return '';
  };

  const planName = getLocalizedValue(plan.name);
  const preheader = isSpanish
    ? `Su cotización para el plan "${planName}" está lista.`
    : `Your quotation for the "${planName}" plan is ready.`;

  const title = isSpanish ? 'Cotización de Plan' : 'Plan Quotation';
  const cycleLabel = isSpanish
    ? (billingCycle === 'annual' ? 'Anual (20% Desc.)' : 'Mensual')
    : (billingCycle === 'annual' ? 'Annual (20% Off)' : 'Monthly');

  const unitPrice = billingCycle === 'annual' ? plan.price * 0.8 : plan.price;

  const featuresHtml = plan.features
    .map((f) => {
      const text = getLocalizedValue(f.text);
      const mark = f.included ? '✔️' : '❌';
      const color = f.included ? '#16A34A' : '#94A3B8';
      const textDecoration = f.included ? '' : 'text-decoration: line-through; opacity: 0.6;';
      return `
        <li style="margin-bottom: 8px; font-size: 14px; color: #334155; list-style-type: none;">
          <span style="color: ${color}; margin-right: 8px; font-weight: bold;">${mark}</span>
          <span style="${textDecoration}">${text}</span>
        </li>
      `;
    })
    .join('');

  const cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 160px; font-weight: 500;">${isSpanish ? 'Plan Seleccionado:' : 'Selected Plan:'}</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${planName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'Ciclo de Facturación:' : 'Billing Cycle:'}</td>
        <td style="padding: 6px 0; color: #0F172A;">${cycleLabel}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'Cantidad de Equipos:' : 'Equipment Count:'}</td>
        <td style="padding: 6px 0; color: #0F172A;">${equipmentCount}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'Precio Unitario / mes:' : 'Unit Price / mo:'}</td>
        <td style="padding: 6px 0; color: #0F172A;">$${unitPrice.toFixed(2)}</td>
      </tr>
      <tr style="border-top: 1px solid #E2E8F0;">
        <td style="padding: 8px 0 6px 0; color: #64748B; font-weight: 500;">Subtotal:</td>
        <td style="padding: 8px 0 6px 0; color: #0F172A; font-weight: 600;">$${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'ITBIS (18%):' : 'Taxes (ITBIS 18%):'}</td>
        <td style="padding: 6px 0; color: #0F172A;">$${tax.toFixed(2)}</td>
      </tr>
      <tr style="border-top: 2px solid #0F172A;">
        <td style="padding: 10px 0; color: #0F172A; font-weight: 700; font-size: 16px;">${isSpanish ? 'Total Estimado:' : 'Estimated Total:'}</td>
        <td style="padding: 10px 0; color: #2563EB; font-weight: 700; font-size: 18px;">$${total.toFixed(2)}</td>
      </tr>
    </table>
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      ${isSpanish ? `Hola ${clientName},` : `Hello ${clientName},`}
    </h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      ${isSpanish ? 'A solicitud suya, hemos generado una cotización formal para el plan de servicios administrados seleccionado.' : 'As requested, we have generated a formal quotation for your selected managed services plan.'}
    </p>
    ${renderInfoCard(isSpanish ? 'Detalles de la Cotización' : 'Quotation Details', cardHtml, palette.brand)}

    <div style="background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h4 style="color: #1E293B; font-size: 15px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
        ${isSpanish ? 'Características del Plan' : 'Plan Features'}
      </h4>
      <ul style="padding-left: 0; margin: 0; list-style-type: none;">
        ${featuresHtml}
      </ul>
    </div>
  `;

  const body = getEmailLayout({
    preheader,
    title,
    headerIcon: '📋',
    accentColor: palette.brand,
    language,
    contentHtml,
    actionUrl: portalUrl,
    actionText: isSpanish ? 'Ver Planes en el Portal' : 'View Plans in Portal',
  });

  await sendEmail({
    to: clientEmail,
    subject: isSpanish
      ? `Cotización de Plan de Soporte - ${planName}`
      : `Support Plan Quotation - ${planName}`,
    body,
    type: 'EMAIL',
  });
}

/**
 * Sends an invoice payment due email notification to the client.
 *
 * @param clientEmail - Recipient email address
 * @param clientName - Recipient display name
 * @param invoice - Invoice entity
 * @param language - Language code ('es_DO', 'en_US')
 */
export async function sendInvoiceDueEmail(
  clientEmail: string,
  clientName: string,
  invoice: Invoice,
  language: string,
): Promise<void> {
  const isSpanish = language.startsWith('es');
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/billing`;

  const formattedTotal = `$${Number(invoice.total).toFixed(2)}`;
  const dueDateStr = new Date(invoice.due_date).toLocaleDateString(isSpanish ? 'es-DO' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const preheader = isSpanish
    ? `Recordatorio de pago pendiente para la factura ${invoice.invoice_number} por un total de ${formattedTotal}.`
    : `Payment reminder for invoice ${invoice.invoice_number} totaling ${formattedTotal}.`;

  const title = isSpanish ? 'Recordatorio de Factura Pendiente' : 'Outstanding Invoice Reminder';

  const cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 160px; font-weight: 500;">${isSpanish ? 'Número de Factura:' : 'Invoice Number:'}</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600; font-family: monospace;">${invoice.invoice_number}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'Fecha de Vencimiento:' : 'Due Date:'}</td>
        <td style="padding: 6px 0; color: #0F172A;">${dueDateStr}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'Estado:' : 'Status:'}</td>
        <td style="padding: 6px 0;">${renderBadge(invoice.status, '#FFFBEB', '#D97706')}</td>
      </tr>
      <tr style="border-top: 2px solid #0F172A;">
        <td style="padding: 10px 0; color: #0F172A; font-weight: 700; font-size: 16px;">${isSpanish ? 'Monto Total Pendiente:' : 'Total Due:'}</td>
        <td style="padding: 10px 0; color: #2563EB; font-weight: 700; font-size: 18px;">${formattedTotal} USD</td>
      </tr>
    </table>
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      ${isSpanish ? `Hola ${clientName},` : `Hello ${clientName},`}
    </h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      ${isSpanish ? `Le recordamos que la factura <strong>${invoice.invoice_number}</strong> tiene un pago pendiente con fecha de vencimiento el ${dueDateStr}.` : `This is a reminder that payment for invoice <strong>${invoice.invoice_number}</strong> is due on ${dueDateStr}.`}
    </p>
    ${renderInfoCard(isSpanish ? 'Detalles de la Factura' : 'Invoice Details', cardHtml, palette.warning)}
    ${renderCallout(isSpanish ? 'Para evitar interrupciones en el servicio, complete el pago a través del portal de clientes.' : 'To prevent service interruption, please complete payment via the client portal.', 'warning')}
    ${renderDisclaimer(isSpanish ? 'Si ya realizó el pago, por favor ignore este recordatorio. Los pagos pueden tardar hasta 24 horas en reflejarse.' : 'If you have already made the payment, please disregard this reminder. Payments may take up to 24 hours to reflect.')}
  `;

  const body = getEmailLayout({
    preheader,
    title,
    headerIcon: '💰',
    accentColor: palette.warning,
    language,
    contentHtml,
    actionUrl: portalUrl,
    actionText: isSpanish ? 'Pagar Factura en Portal' : 'Pay Invoice in Portal',
  });

  await sendEmail({
    to: clientEmail,
    subject: isSpanish
      ? `Recordatorio de Pago: Factura ${invoice.invoice_number}`
      : `Payment Reminder: Invoice ${invoice.invoice_number}`,
    body,
    type: 'EMAIL',
  });
}

/**
 * Sends a subscription expiry warning email to the client (7 days before renewal).
 *
 * @param clientEmail - Recipient email address
 * @param clientName - Recipient display name
 * @param serviceName - Subscribed service/plan name
 * @param renewalDate - Scheduled renewal date
 * @param language - Language code ('es_DO', 'en_US')
 */
export async function sendSubscriptionExpiringEmail(
  clientEmail: string,
  clientName: string,
  serviceName: string,
  renewalDate: Date,
  language: string,
): Promise<void> {
  const isSpanish = language.startsWith('es');
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/plans`;

  const renewalDateStr = renewalDate.toLocaleDateString(isSpanish ? 'es-DO' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const preheader = isSpanish
    ? `Su suscripción a ${serviceName} vence el ${renewalDateStr}. Renueve para evitar interrupciones.`
    : `Your subscription to ${serviceName} expires on ${renewalDateStr}. Renew to avoid interruptions.`;

  const title = isSpanish ? 'Suscripción por Vencer' : 'Subscription Expiring Soon';

  const cardHtml = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 160px; font-weight: 500;">${isSpanish ? 'Servicio:' : 'Service:'}</td>
        <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${serviceName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B; font-weight: 500;">${isSpanish ? 'Fecha de Vencimiento:' : 'Expiry Date:'}</td>
        <td style="padding: 6px 0; color: #DC2626; font-weight: 600;">${renewalDateStr}</td>
      </tr>
    </table>
  `;

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      ${isSpanish ? `Hola ${clientName},` : `Hello ${clientName},`}
    </h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      ${isSpanish
        ? `Su suscripción a <strong>${serviceName}</strong> está programada para vencer el <strong>${renewalDateStr}</strong>. Para evitar interrupciones en el servicio, le recomendamos renovar antes de esa fecha.`
        : `Your subscription to <strong>${serviceName}</strong> is scheduled to expire on <strong>${renewalDateStr}</strong>. To avoid any service interruption, we recommend renewing before that date.`}
    </p>
    ${renderInfoCard(isSpanish ? 'Detalles de la Suscripción' : 'Subscription Details', cardHtml, palette.warning)}
    ${renderCallout(isSpanish
      ? 'Una vez que la suscripción venza, no podrá crear tickets de soporte ni acceder a las funcionalidades del portal hasta que renueve.'
      : 'Once the subscription expires, you will not be able to create support tickets or access portal features until you renew.', 'warning')}
    ${renderDisclaimer(isSpanish
      ? 'Si ya renovó su suscripción, por favor ignore este mensaje.'
      : 'If you have already renewed your subscription, please disregard this email.')}
  `;

  const body = getEmailLayout({
    preheader,
    title,
    headerIcon: '⏰',
    accentColor: palette.warning,
    language,
    contentHtml,
    actionUrl: portalUrl,
    actionText: isSpanish ? 'Renovar Suscripción' : 'Renew Subscription',
  });

  await sendEmail({
    to: clientEmail,
    subject: isSpanish
      ? `Su suscripción a ${serviceName} vence pronto`
      : `Your ${serviceName} subscription is expiring soon`,
    body,
    type: 'EMAIL',
  });
}

/**
 * Sends an OTP 6-digit verification code email to a user.
 *
 * @param recipientEmail - Recipient email address
 * @param recipientName - Recipient display name
 * @param otp - 6-digit OTP string
 * @param language - Optional language code ('es_DO', 'en_US')
 */
export async function sendOTPEmail(
  recipientEmail: string,
  recipientName: string,
  otp: string,
  language?: string,
): Promise<void> {
  const isSpanish = (language || 'en_US').startsWith('es');
  const preheader = isSpanish ? `Su código de verificación es ${otp}.` : `Your account verification code is ${otp}.`;
  const title = isSpanish ? 'Verificación de Cuenta' : 'Account Verification';

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      ${isSpanish ? `Hola ${recipientName},` : `Hello ${recipientName},`}
    </h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 24px;">
      ${isSpanish ? 'Gracias por registrarse en el Portal de Servicios MSP de Velmar Technology. Utilice el siguiente código de 6 dígitos para completar la verificación de su cuenta:' : 'Thank you for registering with Velmar Technology MSP Portal. Please use the following 6-digit verification code to complete your registration:'}
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #2563EB; font-family: monospace;">${otp}</span>
    </div>

    ${renderCallout(isSpanish ? 'Este código expirará en 15 minutos.' : 'This code will expire in 15 minutes.', 'warning')}
    ${renderDisclaimer(isSpanish ? 'Si no solicitó este registro, puede ignorar este mensaje de forma segura.' : 'If you did not register on our platform, you can safely ignore this email.')}
  `;

  const body = getEmailLayout({
    preheader,
    title,
    headerIcon: '✉️',
    accentColor: palette.brandAccent,
    language,
    contentHtml,
  });

  await sendEmail({
    to: recipientEmail,
    subject: isSpanish ? `Código de Verificación: ${otp}` : `Your Verification Code: ${otp}`,
    body,
    type: 'EMAIL',
  });
}

/**
 * Sends a password reset email to the user with a secure reset link.
 *
 * @param recipientEmail - Recipient email address
 * @param recipientName - Recipient display name
 * @param resetToken - Cryptographic reset token string
 * @param language - Optional language code ('es_DO', 'en_US')
 */
export async function sendPasswordResetEmail(
  recipientEmail: string,
  recipientName: string,
  resetToken: string,
  language?: string,
): Promise<void> {
  const isSpanish = (language || 'en_US').startsWith('es');
  const portalUrl = `${env.CORS_ORIGIN || 'http://localhost:5173'}/login?openModal=reset-password&token=${encodeURIComponent(resetToken)}`;
  const preheader = isSpanish
    ? 'Haga clic en el enlace para restablecer su contraseña del portal de soporte.'
    : 'Click the link to reset your support portal password.';

  const title = isSpanish ? 'Restablecimiento de Contraseña' : 'Password Reset Request';
  const actionText = isSpanish ? 'Restablecer Contraseña' : 'Reset Password';

  const contentHtml = `
    <h2 style="color: #0F172A; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 12px;">
      ${isSpanish ? `Hola ${recipientName},` : `Hello ${recipientName},`}
    </h2>
    <p style="font-size: 15px; color: #475569; margin-top: 0; margin-bottom: 20px;">
      ${isSpanish ? 'Hemos recibido una solicitud para restablecer la contraseña de su cuenta en el Portal de Clientes de <strong>Velmar Technology</strong>.' : 'We received a request to reset the password for your account on the <strong>Velmar Technology</strong> Client Portal.'}
    </p>
    <p style="font-size: 14px; color: #64748B; margin-top: 0; margin-bottom: 24px;">
      ${isSpanish ? 'Para crear una nueva contraseña, haga clic en el botón a continuación:' : 'To set a new password, click the button below:'}
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="font-size: 12px; color: #64748B; margin: 0 0 6px 0;">
        ${isSpanish ? 'Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:' : 'If the button above does not work, copy and paste this link into your browser:'}
      </p>
      <p style="font-size: 12px; word-break: break-all; color: #2563EB; margin: 0;">
        <a href="${portalUrl}" style="color: #2563EB; text-decoration: underline;">${portalUrl}</a>
      </p>
      <p style="font-size: 12px; color: #DC2626; margin-top: 10px; margin-bottom: 0; font-weight: 500;">
        ⚠️ ${isSpanish ? 'Este enlace es válido únicamente durante 1 hora.' : 'This link is valid for 1 hour only.'}
      </p>
    </div>

    ${renderDisclaimer(isSpanish ? 'Si no solicitó este cambio, puede ignorar este mensaje de forma segura. Su contraseña actual permanecerá intacta.' : 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.')}
  `;

  const body = getEmailLayout({
    preheader,
    title,
    headerIcon: '🔐',
    accentColor: palette.cta,
    language,
    contentHtml,
    actionUrl: portalUrl,
    actionText,
  });

  await sendEmail({
    to: recipientEmail,
    subject: isSpanish
      ? 'Restablecimiento de Contraseña - Velmar Technology Portal'
      : 'Password Reset Request - Velmar Technology Portal',
    body,
    type: 'EMAIL',
  });
}
