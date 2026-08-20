/**
 * ─────────────────────────────────────────────────────────────
 *  Velmar Technology — Email Design Token System
 * ─────────────────────────────────────────────────────────────
 *
 *  Single source of truth for every visual decision across all
 *  email templates. Templates MUST import from here — never
 *  hard-code hex values or spacing numbers.
 */

/* ── Brand Palette ────────────────────────────────────────── */
export const palette = {
  /* Primary surface / CTA */
  brand:          '#0C4A6E',   // Deep ocean-blue (header background)
  brandLight:     '#0369A1',   // Mid-tone for secondary accents
  brandAccent:    '#38BDF8',   // Sky highlight — used sparingly

  /* CTA Button */
  cta:            '#2563EB',   // Action-blue (buttons, links)
  ctaHover:       '#1D4ED8',   // Hover shade (for alt-text only)
  ctaShadow:      'rgba(37, 99, 235, 0.18)',

  /* Neutrals — lightest → darkest */
  white:          '#FFFFFF',
  surface:        '#F8FAFC',   // Email body background
  cardBg:         '#FFFFFF',   // Content card
  infoBg:         '#F1F5F9',   // Info-box / callout background
  border:         '#E2E8F0',   // Universal divider / card border
  muted:          '#94A3B8',   // Timestamps, disclaimers
  secondary:      '#64748B',   // Labels, helper text
  body:           '#334155',   // Main paragraph text
  heading:        '#0F172A',   // Headings, bold data
  headingAlt:     '#1E293B',   // Sub-headings inside cards

  /* Semantic — status / priority */
  success:        '#16A34A',
  successBg:      '#F0FDF4',
  warning:        '#D97706',
  warningBg:      '#FFFBEB',
  danger:         '#DC2626',
  dangerBg:       '#FEF2F2',
  dangerLight:    '#EF4444',
  info:           '#2563EB',
  infoBgAlt:      '#EFF6FF',

  /* Priority badge colors */
  priorityLow:      { bg: '#F1F5F9', text: '#475569' },
  priorityMedium:   { bg: '#FEF3C7', text: '#92400E' },
  priorityHigh:     { bg: '#FEE2E2', text: '#991B1B' },
  priorityCritical: { bg: '#FCA5A5', text: '#7F1D1D' },
} as const;

/* ── Typography ───────────────────────────────────────────── */
export const font = {
  family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono:   "'Courier New', Courier, monospace",

  size: {
    xs:   '11px',
    sm:   '12px',
    base: '14px',
    md:   '15px',
    lg:   '16px',
    xl:   '20px',
    xxl:  '24px',
    code: '32px',   // OTP digits
  },

  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
    black:    800,
  },

  lineHeight: {
    tight: 1.3,
    normal: 1.6,
    relaxed: 1.8,
  },
} as const;

/* ── Spacing ──────────────────────────────────────────────── */
export const space = {
  '0':  '0',
  '1':  '4px',
  '2':  '6px',
  '3':  '8px',
  '4':  '10px',
  '5':  '12px',
  '6':  '16px',
  '7':  '20px',
  '8':  '24px',
  '9':  '28px',
  '10': '32px',
  '12': '36px',
  '14': '40px',
  '16': '48px',
} as const;

/* ── Radii ────────────────────────────────────────────────── */
export const radius = {
  sm:  '6px',
  md:  '8px',
  lg:  '12px',
  xl:  '16px',
  pill: '9999px',
} as const;

/* ── Shadows ──────────────────────────────────────────────── */
export const shadow = {
  card: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)',
  cta:  '0 4px 12px rgba(37, 99, 235, 0.20)',
} as const;

/* ── Layout constants ─────────────────────────────────────── */
export const layout = {
  maxWidth: '600px',
  headerPadding: `${space['12']} ${space['10']}`,    // 36px 32px
  bodyPadding:   `${space['14']} ${space['10']}`,    // 40px 32px
  footerPadding: `${space['8']} ${space['10']}`,     // 24px 32px
  cardPadding:   space['7'],                          // 20px
} as const;

/* ── Priority helpers ─────────────────────────────────────── */
export function getPriorityColor(priority: string): { bg: string; text: string } {
  const key = priority.toUpperCase();
  if (key === 'LOW')      return palette.priorityLow;
  if (key === 'MEDIUM')   return palette.priorityMedium;
  if (key === 'HIGH')     return palette.priorityHigh;
  if (key === 'CRITICAL') return palette.priorityCritical;
  return palette.priorityLow;
}
