/**
 * ─────────────────────────────────────────────────────────────
 *  Velmar Technology — Shared Email Sub-Components
 * ─────────────────────────────────────────────────────────────
 *
 *  Reusable, token-driven building blocks used inside every
 *  email template so that the visual rhythm is identical
 *  regardless of which template renders.
 */
import React from 'react';
import { palette, font, space, radius } from './tokens';

/* ─────────────────────── Greeting ────────────────────────── */
export interface GreetingProps {
  name: string;
  isSpanish?: boolean;
}

export const Greeting: React.FC<GreetingProps> = ({ name, isSpanish }) => (
  <h2
    style={{
      color: palette.heading,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      fontFamily: font.family,
      marginTop: 0,
      marginBottom: space['5'],
      lineHeight: font.lineHeight.tight,
    }}
  >
    {isSpanish ? `Hola ${name},` : `Hello ${name},`}
  </h2>
);

/* ─────────────────── Body Paragraph ──────────────────────── */
export interface BodyTextProps {
  children: React.ReactNode;
  muted?: boolean;
  small?: boolean;
}

export const BodyText: React.FC<BodyTextProps> = ({ children, muted, small }) => (
  <p
    style={{
      fontSize: small ? font.size.base : font.size.md,
      color: muted ? palette.secondary : palette.body,
      fontFamily: font.family,
      marginTop: 0,
      marginBottom: space['8'],
      lineHeight: font.lineHeight.normal,
    }}
  >
    {children}
  </p>
);

/* ─────────────────── Info Card Box ───────────────────────── */
export interface InfoCardProps {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  children,
  accentColor = palette.cta,
}) => (
  <div
    style={{
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: space['8'],
    }}
  >
    {/* Colored top accent bar */}
    <div style={{ height: '3px', backgroundColor: accentColor }} />

    {/* Card header */}
    <div
      style={{
        padding: `${space['6']} ${space['7']} ${space['4']} ${space['7']}`,
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <h3
        style={{
          color: palette.headingAlt,
          fontSize: font.size.lg,
          fontWeight: font.weight.bold,
          fontFamily: font.family,
          margin: 0,
          lineHeight: font.lineHeight.tight,
        }}
      >
        {title}
      </h3>
    </div>

    {/* Card body */}
    <div style={{ padding: space['7'] }}>{children}</div>
  </div>
);

/* ─────────────── Detail Row (key-value) ──────────────────── */
export interface DetailRowProps {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}

export const DetailRow: React.FC<DetailRowProps> = ({ label, children, isLast }) => (
  <div
    style={{
      display: 'flex',
      padding: `${space['3']} 0`,
      borderBottom: isLast ? 'none' : `1px solid ${palette.border}`,
      fontSize: font.size.base,
      fontFamily: font.family,
      lineHeight: font.lineHeight.normal,
    }}
  >
    <span
      style={{
        color: palette.secondary,
        fontWeight: font.weight.medium,
        minWidth: '130px',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <span style={{ color: palette.heading, fontWeight: font.weight.semibold, flex: 1 }}>
      {children}
    </span>
  </div>
);

/* ──────────────────── Inline Badge ───────────────────────── */
export interface BadgeProps {
  children: React.ReactNode;
  bg: string;
  color: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, bg, color }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: radius.sm,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      fontFamily: font.family,
      backgroundColor: bg,
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      lineHeight: '1.6',
    }}
  >
    {children}
  </span>
);

/* ─────────────── Warning / Info Callout ──────────────────── */
export interface CalloutProps {
  children: React.ReactNode;
  variant?: 'warning' | 'danger' | 'info' | 'muted';
}

const calloutConfig = {
  warning: { bg: palette.warningBg, border: '#FDE68A', icon: '⚠️', textColor: palette.warning },
  danger:  { bg: palette.dangerBg,  border: '#FECACA', icon: '🔒', textColor: palette.danger },
  info:    { bg: palette.infoBgAlt, border: '#BFDBFE', icon: 'ℹ️', textColor: palette.info },
  muted:   { bg: palette.surface,   border: palette.border, icon: '',   textColor: palette.secondary },
};

export const Callout: React.FC<CalloutProps> = ({ children, variant = 'muted' }) => {
  const cfg = calloutConfig[variant];
  return (
    <div
      style={{
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: radius.md,
        padding: `${space['5']} ${space['6']}`,
        marginBottom: space['8'],
        fontSize: font.size.sm,
        fontFamily: font.family,
        color: cfg.textColor,
        lineHeight: font.lineHeight.normal,
      }}
    >
      {cfg.icon && <span style={{ marginRight: space['3'] }}>{cfg.icon}</span>}
      {children}
    </div>
  );
};

/* ──────────── Disclaimer / fine-print ────────────────────── */
export interface DisclaimerProps {
  children: React.ReactNode;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ children }) => (
  <p
    style={{
      fontSize: font.size.sm,
      color: palette.muted,
      fontFamily: font.family,
      marginTop: space['8'],
      marginBottom: 0,
      lineHeight: font.lineHeight.normal,
    }}
  >
    {children}
  </p>
);

/* ──────────── Highlighted Code / Value ───────────────────── */
export interface HighlightCodeProps {
  children: React.ReactNode;
}

export const HighlightCode: React.FC<HighlightCodeProps> = ({ children }) => (
  <div
    style={{
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: radius.lg,
      padding: space['8'],
      textAlign: 'center',
      marginBottom: space['8'],
    }}
  >
    <span
      style={{
        fontSize: font.size.code,
        fontWeight: font.weight.black,
        letterSpacing: '0.25em',
        color: palette.cta,
        fontFamily: font.mono,
      }}
    >
      {children}
    </span>
  </div>
);

/* ──────────── Fallback Link Box ──────────────────────────── */
export interface FallbackLinkProps {
  url: string;
  isSpanish?: boolean;
  expiresLabel?: string;
}

export const FallbackLink: React.FC<FallbackLinkProps> = ({ url, isSpanish, expiresLabel }) => (
  <div
    style={{
      backgroundColor: palette.surface,
      border: `1px solid ${palette.border}`,
      borderRadius: radius.md,
      padding: space['6'],
      marginBottom: space['8'],
    }}
  >
    <p
      style={{
        fontSize: font.size.sm,
        color: palette.secondary,
        fontFamily: font.family,
        margin: `0 0 ${space['2']} 0`,
      }}
    >
      {isSpanish
        ? 'Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:'
        : 'If the button does not work, copy and paste this link into your browser:'}
    </p>
    <p
      style={{
        fontSize: font.size.sm,
        wordBreak: 'break-all',
        color: palette.cta,
        fontFamily: font.family,
        margin: 0,
      }}
    >
      <a href={url} style={{ color: palette.cta, textDecoration: 'underline' }}>
        {url}
      </a>
    </p>
    {expiresLabel && (
      <p
        style={{
          fontSize: font.size.sm,
          color: palette.dangerLight,
          fontWeight: font.weight.medium,
          fontFamily: font.family,
          marginTop: space['4'],
          marginBottom: 0,
        }}
      >
        ⏱️ {expiresLabel}
      </p>
    )}
  </div>
);
