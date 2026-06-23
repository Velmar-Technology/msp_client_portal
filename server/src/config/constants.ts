// ============================================
// Application Constants
// ============================================

/** SLA window in milliseconds — 1 hour for warranty/service ticket modifications */
export const SLA_WINDOW_MS = 60 * 60 * 1000; // 1 hour

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

/** Plan pricing */
export const PLAN_PRICES = {
  BASIC: 299,
  STANDARD: 599,
  PREMIUM: 1299,
} as const;

/** Tax rate */
export const TAX_RATE = 0.18; // 18% ITBIS

/** Ticket status transitions allowed */
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['AWAITING_PAYMENT', 'RESOLVED', 'OPEN'],
  AWAITING_PAYMENT: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: [],
  CANCELLED: [],
};
