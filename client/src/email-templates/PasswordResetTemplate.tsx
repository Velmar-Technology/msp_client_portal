import React from 'react';
import { EmailWrapper } from './EmailWrapper';
import { Greeting, BodyText, FallbackLink, Disclaimer } from './components';
import { palette } from './tokens';
import type { PasswordResetEmailProps } from './types';

export const PasswordResetTemplate: React.FC<PasswordResetEmailProps> = ({
  recipientName,
  resetUrl,
  language = 'en_US',
  expiresInMinutes = 60,
}) => {
  const isSpanish = language.startsWith('es');

  const title = isSpanish ? 'Restablecimiento de Contraseña' : 'Password Reset Request';
  const preheader = isSpanish
    ? 'Haga clic en el enlace para restablecer su contraseña del portal.'
    : 'Click the link to reset your portal password.';
  const actionText = isSpanish ? 'Restablecer Contraseña' : 'Reset Password';

  const expiresLabel = isSpanish
    ? `Este enlace es válido únicamente durante ${expiresInMinutes} minutos.`
    : `This link is only valid for ${expiresInMinutes} minutes.`;

  return (
    <EmailWrapper
      title={title}
      preheader={preheader}
      actionUrl={resetUrl}
      actionText={actionText}
      headerIcon="🔐"
      accentColor={palette.cta}
      language={language}
    >
      <Greeting name={recipientName} isSpanish={isSpanish} />

      <BodyText>
        {isSpanish ? (
          <>
            Hemos recibido una solicitud para restablecer la contraseña de su cuenta en el Portal
            de Clientes de <strong>Velmar Technology</strong>.
          </>
        ) : (
          <>
            We received a request to reset the password for your account on the{' '}
            <strong>Velmar Technology</strong> Client Portal.
          </>
        )}
      </BodyText>

      <BodyText muted>
        {isSpanish
          ? 'Para crear una nueva contraseña, haga clic en el botón a continuación:'
          : 'To create a new password, click the button below:'}
      </BodyText>

      <FallbackLink url={resetUrl} isSpanish={isSpanish} expiresLabel={expiresLabel} />

      <Disclaimer>
        {isSpanish
          ? 'Si no solicitó este cambio, puede ignorar este mensaje de forma segura. Su contraseña actual permanecerá intacta.'
          : 'If you did not request this change, you can safely ignore this email. Your current password remains unchanged.'}
      </Disclaimer>
    </EmailWrapper>
  );
};
