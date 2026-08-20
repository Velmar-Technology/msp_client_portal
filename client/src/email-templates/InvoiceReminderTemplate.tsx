import React from 'react';
import { EmailWrapper } from './EmailWrapper';
import { Greeting, BodyText, InfoCard, DetailRow, Callout, Disclaimer } from './components';
import { palette, font } from './tokens';
import type { InvoiceEmailProps } from './types';

export const InvoiceReminderTemplate: React.FC<InvoiceEmailProps> = ({
  recipientName,
  invoiceNumber,
  amount,
  dueDate,
  paymentUrl,
  language = 'en_US',
}) => {
  const isSpanish = language.startsWith('es');

  const title = isSpanish ? 'Recordatorio de Factura Pendiente' : 'Outstanding Invoice Reminder';
  const preheader = isSpanish
    ? `Su factura ${invoiceNumber} por $${amount.toFixed(2)} está pendiente de pago.`
    : `Your invoice ${invoiceNumber} for $${amount.toFixed(2)} is pending payment.`;
  const actionText = isSpanish ? 'Pagar Factura en Portal' : 'Pay Invoice in Portal';

  return (
    <EmailWrapper
      title={title}
      preheader={preheader}
      actionUrl={paymentUrl}
      actionText={actionText}
      headerIcon="💰"
      accentColor={palette.warning}
      language={language}
    >
      <Greeting name={recipientName} isSpanish={isSpanish} />

      <BodyText>
        {isSpanish
          ? `Le recordamos que tiene una factura pendiente de pago con fecha de vencimiento el ${dueDate}.`
          : `This is a friendly reminder that you have an outstanding invoice due on ${dueDate}.`}
      </BodyText>

      <InfoCard
        title={isSpanish ? 'Resumen de Factura' : 'Invoice Summary'}
        accentColor={palette.warning}
      >
        <DetailRow label={isSpanish ? 'No. Factura' : 'Invoice No.'}>
          {invoiceNumber}
        </DetailRow>
        <DetailRow label={isSpanish ? 'Monto Total' : 'Total Amount'}>
          <span
            style={{
              color: palette.cta,
              fontWeight: font.weight.bold,
              fontSize: font.size.lg,
            }}
          >
            ${amount.toFixed(2)} USD
          </span>
        </DetailRow>
        <DetailRow label={isSpanish ? 'Vencimiento' : 'Due Date'} isLast>
          {dueDate}
        </DetailRow>
      </InfoCard>

      <Callout variant="warning">
        {isSpanish
          ? 'Para evitar interrupciones en el servicio, complete el pago a través del portal de clientes.'
          : 'To prevent service interruption, please complete payment via the client portal.'}
      </Callout>

      <Disclaimer>
        {isSpanish
          ? 'Si ya realizó el pago, por favor ignore este recordatorio. Los pagos pueden tardar hasta 24 horas en reflejarse.'
          : 'If you have already made the payment, please disregard this reminder. Payments may take up to 24 hours to reflect.'}
      </Disclaimer>
    </EmailWrapper>
  );
};
