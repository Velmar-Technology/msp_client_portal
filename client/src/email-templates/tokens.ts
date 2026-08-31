/**
 * ─────────────────────────────────────────────────────────────
 *  Velmar Technology — Email Design Token System
 * ─────────────────────────────────────────────────────────────
 *
 *  Single source of truth for every visual decision across all
 *  email templates. Templates MUST import from here — never
 *  hard-code hex values or spacing numbers.
 */

/* ── Brand Palette (Aligned with Velmar Technology Logo) ──── */
export const palette = {
  /* Obsidian Tech Backgrounds & Brand Cores */
  brandDark:      '#080C16',   // Deep obsidian / charcoal tech background
  brand:          '#0A0F1D',   // Header banner obsidian container
  brandBlue:      '#0084FF',   // Electric Cerulean Blue (left checkmark wings & banner)
  brandOrange:    '#FF6600',   // Vibrant Flame Orange (right checkmark wings & top trim)
  brandLight:     '#0091FF',   // Electric blue highlight
  brandAccent:    '#38BDF8',   // Sky accent

  /* CTA Buttons & Links */
  cta:            '#0084FF',   // Electric action-blue
  ctaHover:       '#0070D8',   // Hover shade (for alt-text only)
  ctaShadow:      'rgba(0, 132, 255, 0.25)',
  ctaOrange:      '#FF6600',   // Orange action for billing / warnings
  ctaOrangeShadow:'rgba(255, 102, 0, 0.25)',

  /* Gradients */
  headerGradient: 'linear-gradient(135deg, #050811 0%, #0A0F1D 50%, #0F172A 100%)',
  accentGradient: 'linear-gradient(90deg, #0084FF 0%, #00C6FF 35%, #FF8A00 70%, #FF6600 100%)',

  /* Neutrals — lightest → darkest */
  white:          '#FFFFFF',
  surface:        '#F8FAFC',   // Email body background
  cardBg:         '#FFFFFF',   // Content card
  infoBg:         '#F1F5F9',   // Info-box / callout background
  border:         '#E2E8F0',   // Universal divider / card border
  borderDark:     '#1E293B',
  muted:          '#94A3B8',   // Timestamps, disclaimers
  secondary:      '#64748B',   // Labels, helper text
  body:           '#334155',   // Main paragraph text
  heading:        '#0F172A',   // Headings, bold data
  headingAlt:     '#1E293B',   // Sub-headings inside cards

  /* Semantic — status / priority */
  success:        '#16A34A',
  successBg:      '#F0FDF4',
  warning:        '#FF6600',   // Flame Orange for warnings
  warningBg:      '#FFF7ED',
  danger:         '#DC2626',
  dangerBg:       '#FEF2F2',
  dangerLight:    '#EF4444',
  info:           '#0084FF',
  infoBgAlt:      '#EFF6FF',

  /* Priority badge colors */
  priorityLow:      { bg: '#F1F5F9', text: '#475569' },
  priorityMedium:   { bg: '#FFEDD5', text: '#C2410C' },
  priorityHigh:     { bg: '#FEE2E2', text: '#991B1B' },
  priorityCritical: { bg: '#FCA5A5', text: '#7F1D1D' },
} as const;

/* ── Typography ───────────────────────────────────────────── */
export const font = {
  family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono:   "'Courier New', Courier, monospace",

  size: {
    xs:   '10px',
    sm:   '11px',
    base: '13px',
    md:   '14px',
    lg:   '15px',
    xl:   '17px',
    xxl:  '20px',
    code: '24px',   // OTP digits (compact)
  },

  weight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
    black:    800,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.65,
  },
} as const;

/* ── Spacing ──────────────────────────────────────────────── */
export const space = {
  '0':  '0',
  '1':  '2px',
  '2':  '4px',
  '3':  '6px',
  '4':  '8px',
  '5':  '10px',
  '6':  '12px',
  '7':  '14px',
  '8':  '16px',
  '9':  '20px',
  '10': '24px',
  '12': '28px',
  '14': '32px',
  '16': '40px',
} as const;

/* ── Radii ────────────────────────────────────────────────── */
export const radius = {
  sm:   '4px',
  md:   '6px',
  lg:   '8px',
  xl:   '12px',
  pill: '9999px',
} as const;

/* ── Shadows ──────────────────────────────────────────────── */
export const shadow = {
  card: '0 4px 12px -2px rgba(0,0,0,0.06), 0 2px 4px -1px rgba(0,0,0,0.03)',
  cta:  '0 3px 10px rgba(0, 132, 255, 0.22)',
} as const;

/* ── Layout constants ─────────────────────────────────────── */
export const layout = {
  maxWidth:      '540px',                             // Compact email card width
  headerPadding: `${space['7']} ${space['8']}`,       // 14px 16px
  bodyPadding:   `${space['9']} ${space['8']}`,       // 20px 16px
  footerPadding: `${space['6']} ${space['8']}`,       // 12px 16px
  cardPadding:   space['6'],                          // 12px
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
