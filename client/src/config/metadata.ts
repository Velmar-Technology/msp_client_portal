/**
 * Centralized application metadata variables used throughout the portal
 * and injected into i18next defaultInterpolation variables.
 */
export const APP_METADATA = {
  // Brand & Company Info
  company: 'Velmar Technology SRL',
  shortName: 'Velmar',
  portalName: 'Velmar MSP Portal',
  website: 'https://velmartech.com.do',
  tagline: 'Managed IT Services & Enterprise Support',

  // Contact Channels
  email: 'soporte@velmartech.com.do',
  billingEmail: 'facturacion@velmartech.com.do',
  salesEmail: 'ventas@velmartech.com.do',
  privacyEmail: 'privacy@velmartech.com.do',
  phone: '+1 (849) 925-7586',
  emergencyPhone: '+1 (829) 925-7586',

  // Operating Hours & SLAs
  supportHours: 'Mon - Fri: 9:00 AM - 4:00 PM EST',
  monitoringHours: '24/7 Monitoring & Emergency Response',
  slaTarget: '1-Hour SLA Response',

  // Location & Security
  address: 'San Pedro de Macoris, Dominican Republic',
  securityStandard: 'AES-256 Encryption',
} as const;

export type AppMetadata = typeof APP_METADATA;
