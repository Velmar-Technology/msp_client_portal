// ============================================
// Application Constants
// ============================================

/** Centralized company & app metadata */
export const APP_METADATA = {
  company: 'Velmar Technology SRL',
  shortName: 'Velmar',
  portalName: 'Velmar MSP Portal',
  website: 'https://velmartech.com.do',
  tagline: 'Managed IT Services & Enterprise Support',
  email: 'soporte@velmartech.com.do',
  billingEmail: 'facturacion@velmartech.com.do',
  salesEmail: 'ventas@velmartech.com.do',
  privacyEmail: 'privacidad@velmartech.com.do',
  phone: '+1 (849) 925-7586',
  emergencyPhone: '+1 (829) 925-7586',
  supportHours: 'Mon - Fri: 9:00 AM - 4:00 PM EST',
  address: 'San Pedro de Macoris, Dominican Republic',
  securityStandard: 'AES-256 Encryption',
} as const;

/** SLA window in milliseconds — 1 hour for warranty/service ticket modifications */
export const SLA_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/** Priority-weighted open-ticket load factors for capacity-aware routing */
export const PRIORITY_WEIGHTS = {
  CRITICAL: 4.0,
  HIGH: 2.0,
  MEDIUM: 1.0,
  LOW: 0.5,
} as const;

/** Capacity threshold: when every specialist's weighted load exceeds this, fall back to the general pool */
export const LOAD_CAPACITY_THRESHOLD = 15.0;

/** Reserved specialty used to identify Tier 2 escalation specialists */
export const TIER_2_SPECIALTY = 'Tier 2';

/** Plan feature code that gates monthly ticket quotas (BL-201) */
export const HELPDESK_SUPPORT_FEATURE_CODE = 'HELPDESK_SUPPORT';

/** Dynamic priority-based SLA escalation thresholds (milliseconds) */
export const ESCALATION_THRESHOLDS_MS = {
  CRITICAL: 10 * 60 * 1000, // 10 minutes
  HIGH: 20 * 60 * 1000,     // 20 minutes
  MEDIUM: 45 * 60 * 1000,   // 45 minutes
  LOW: 120 * 60 * 1000,     // 120 minutes
} as const;

/** RMM alert noise reduction & self-healing constants */
export const RMM_DEDUP_WINDOW_MS = 15 * 60 * 1000;   // 15 minutes
export const RMM_FLAP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
export const RMM_FLAP_THRESHOLD = 3;
export const RMM_SELF_HEAL_MAX_MS = 300 * 1000;      // 300 seconds
export const FLAPPING_ALERT_TAG = '[FLAPPING_ALERT]';

/** Default pagination */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Supported file types for ticket attachments */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'video/mp4',
];

/** Tax rate */
export const TAX_RATE = 0.18; // 18% ITBIS

import { TicketStatus } from '@shared/types';

/** Ticket status transitions allowed */
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.AWAITING_PAYMENT, TicketStatus.RESOLVED, TicketStatus.OPEN],
  [TicketStatus.AWAITING_PAYMENT]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.OPEN],
  [TicketStatus.RESOLVED_AUTOMATED]: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.CANCELLED]: [],
};
