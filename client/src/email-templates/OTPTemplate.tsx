import React from 'react';
import { EmailWrapper } from './EmailWrapper';
import { Greeting, BodyText, HighlightCode, Callout, Disclaimer } from './components';
import { palette } from './tokens';
import type { OTPEmailProps } from './types';

export const OTPTemplate: React.FC<OTPEmailProps> = ({
  recipientName,
  otp,
  language = 'en_US',
  expiresInMinutes = 15,
}) => {
  const isSpanish = language.startsWith('es');

  const title = isSpanish ? 'Verificación de Cuenta' : 'Account Verification';
  const preheader = isSpanish
    ? `Su código de verificación es ${otp}.`
    : `Your verification code is ${otp}.`;

  return (
    <EmailWrapper
      title={title}
      preheader={preheader}
      headerIcon="✉️"
      accentColor={palette.brandAccent}
      language={language}
    >
      <Greeting name={recipientName} isSpanish={isSpanish} />

      <BodyText>
        {isSpanish
          ? 'Gracias por registrarse en el Portal de Servicios MSP de Velmar Technology. Utilice el siguiente código de 6 dígitos para completar la verificación de su cuenta:'
          : 'Thank you for registering with the Velmar Technology MSP Portal. Please use the following 6-digit verification code to complete your registration:'}
      </BodyText>

      <HighlightCode>{otp}</HighlightCode>

      <Callout variant="warning">
        {isSpanish
          ? `Este código expirará en ${expiresInMinutes} minutos.`
          : `This code will expire in ${expiresInMinutes} minutes.`}
      </Callout>

      <Disclaimer>
        {isSpanish
          ? 'Si no se registró en nuestra plataforma, puede ignorar este mensaje de forma segura.'
          : 'If you did not register on our platform, you can safely ignore this email.'}
      </Disclaimer>
    </EmailWrapper>
  );
};
