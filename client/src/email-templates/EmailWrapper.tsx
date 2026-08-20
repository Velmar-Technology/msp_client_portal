/**
 * ─────────────────────────────────────────────────────────────
 *  Velmar Technology — Email Layout Wrapper
 * ─────────────────────────────────────────────────────────────
 *
 *  The outermost shell every email renders through. Provides:
 *  - Hidden preheader text
 *  - Brand header with icon indicator
 *  - Padded content slot
 *  - Optional CTA button
 *  - Unified footer
 *
 *  All styling is driven exclusively by ./tokens.ts
 */
import React from 'react';
import { palette, font, space, radius, shadow, layout } from './tokens';

export interface EmailWrapperProps {
  /** Email category title shown below the brand name */
  title: string;
  /** Hidden inbox-preview text */
  preheader?: string;
  children: React.ReactNode;
  /** Primary CTA URL */
  actionUrl?: string;
  /** Primary CTA label */
  actionText?: string;
  /** Icon emoji displayed in the header beside the title */
  headerIcon?: string;
  /** Override the header accent bar color */
  accentColor?: string;
  /** Language override for footer text */
  language?: string;
}

export const EmailWrapper: React.FC<EmailWrapperProps> = ({
  title,
  preheader,
  children,
  actionUrl,
  actionText,
  headerIcon,
  accentColor = palette.brandAccent,
  language = 'en_US',
}) => {
  const isSpanish = language.startsWith('es');

  return (
    <div
      style={{
        backgroundColor: palette.surface,
        padding: `${space['10']} ${space['6']}`,
        fontFamily: font.family,
        color: palette.heading,
        minHeight: '100%',
        WebkitTextSizeAdjust: '100%',
      }}
    >
      {/* ── Hidden preheader ── */}
      {preheader && (
        <div
          style={{
            display: 'none',
            maxHeight: '0px',
            overflow: 'hidden',
            fontSize: '1px',
            color: palette.surface,
          }}
        >
          {preheader}
          {/* Pad the preheader so clients don't pull body text into preview */}
          {'‌ '.repeat(80)}
        </div>
      )}

      {/* ── Centered card ── */}
      <table
        border={0}
        cellPadding={0}
        cellSpacing={0}
        width="100%"
        style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}
      >
        <tbody>
          <tr>
            <td>
              <div
                style={{
                  width: '100%',
                  maxWidth: layout.maxWidth,
                  backgroundColor: palette.cardBg,
                  borderRadius: radius.xl,
                  border: `1px solid ${palette.border}`,
                  overflow: 'hidden',
                  boxShadow: shadow.card,
                  textAlign: 'left',
                }}
              >
                {/* ──── Header ──── */}
                <div
                  style={{
                    background: `linear-gradient(135deg, ${palette.brand} 0%, #064E73 50%, #0C4A6E 100%)`,
                    padding: layout.headerPadding,
                    textAlign: 'center',
                  }}
                >
                  {/* Brand name */}
                  <h1
                    style={{
                      color: palette.white,
                      margin: 0,
                      fontSize: font.size.xxl,
                      fontWeight: font.weight.black,
                      letterSpacing: '-0.025em',
                      fontFamily: font.family,
                    }}
                  >
                    Velmar Technology
                  </h1>
                  {/* Sub-title with optional icon */}
                  <p
                    style={{
                      color: palette.brandAccent,
                      margin: `${space['3']} 0 0 0`,
                      fontSize: font.size.base,
                      fontWeight: font.weight.medium,
                      fontFamily: font.family,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {headerIcon && (
                      <span style={{ marginRight: space['3'] }}>{headerIcon}</span>
                    )}
                    {title}
                  </p>
                </div>

                {/* Accent bar */}
                <div style={{ height: '3px', backgroundColor: accentColor }} />

                {/* ──── Body ──── */}
                <div
                  style={{
                    padding: layout.bodyPadding,
                    lineHeight: String(font.lineHeight.normal),
                    fontSize: font.size.md,
                    color: palette.body,
                    fontFamily: font.family,
                  }}
                >
                  {children}

                  {/* ── CTA Button ── */}
                  {actionUrl && actionText && (
                    <div
                      style={{
                        margin: `${space['10']} 0 ${space['6']} 0`,
                        textAlign: 'center',
                      }}
                    >
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          backgroundColor: palette.cta,
                          color: palette.white,
                          textDecoration: 'none',
                          padding: `${space['5']} ${space['10']}`,
                          borderRadius: radius.md,
                          fontWeight: font.weight.semibold,
                          fontSize: font.size.md,
                          fontFamily: font.family,
                          display: 'inline-block',
                          boxShadow: shadow.cta,
                          letterSpacing: '0.01em',
                        }}
                      >
                        {actionText}
                      </a>
                    </div>
                  )}
                </div>

                {/* ──── Footer ──── */}
                <div
                  style={{
                    backgroundColor: palette.infoBg,
                    padding: layout.footerPadding,
                    textAlign: 'center',
                    borderTop: `1px solid ${palette.border}`,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: palette.secondary,
                      fontSize: font.size.sm,
                      fontWeight: font.weight.medium,
                      fontFamily: font.family,
                    }}
                  >
                    {isSpanish
                      ? 'Esta es una notificación automática del Portal MSP de Velmar.'
                      : 'This is an automated notification from the Velmar MSP Portal.'}
                  </p>
                  <p
                    style={{
                      margin: `${space['1']} 0 0 0`,
                      color: palette.muted,
                      fontSize: font.size.xs,
                      fontFamily: font.family,
                    }}
                  >
                    {isSpanish
                      ? 'No responda directamente a este correo electrónico.'
                      : 'Do not reply directly to this email.'}
                  </p>
                  <p
                    style={{
                      margin: `${space['5']} 0 0 0`,
                      color: palette.secondary,
                      fontSize: font.size.sm,
                      fontWeight: font.weight.medium,
                      fontFamily: font.family,
                    }}
                  >
                    © {new Date().getFullYear()} Velmar Technology SRL.{' '}
                    {isSpanish ? 'Todos los derechos reservados.' : 'All rights reserved.'}
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
