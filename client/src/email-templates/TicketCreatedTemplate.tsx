import React from 'react';
import { EmailWrapper } from './EmailWrapper';
import { Greeting, BodyText, InfoCard, DetailRow, Badge, Disclaimer } from './components';
import { palette, font, space } from './tokens';
import { getPriorityColor } from './tokens';
import type { TicketEmailProps } from './types';

export const TicketCreatedTemplate: React.FC<TicketEmailProps> = ({
  recipientName,
  ticketId,
  ticketTitle,
  category,
  priority,
  description,
  ticketUrl,
  language = 'en_US',
}) => {
  const isSpanish = language.startsWith('es');
  const priColor = getPriorityColor(priority);

  const title = isSpanish ? 'Ticket de Soporte Abierto' : 'Ticket Successfully Opened';
  const preheader = isSpanish
    ? `Su ticket "${ticketTitle}" ha sido creado exitosamente.`
    : `Your ticket "${ticketTitle}" has been created successfully.`;
  const actionText = isSpanish ? 'Ver Ticket en el Portal' : 'Track Ticket in Portal';

  return (
    <EmailWrapper
      title={title}
      preheader={preheader}
      actionUrl={ticketUrl}
      actionText={actionText}
      accentColor={palette.brandLight}
      language={language}
    >
      <Greeting name={recipientName} isSpanish={isSpanish} />

      <BodyText>
        {isSpanish
          ? 'Hemos recibido su solicitud de soporte y se ha creado un ticket. Nuestro equipo técnico ha sido notificado y comenzará el diagnóstico en breve.'
          : 'We have received your support request and opened a ticket. Our engineering team has been notified, and a technician will begin diagnosing your request shortly.'}
      </BodyText>

      <InfoCard
        title={isSpanish ? 'Detalles del Ticket' : 'Ticket Details'}
        accentColor={palette.brandLight}
      >
        <DetailRow label={isSpanish ? 'ID Ticket' : 'Ticket ID'}>
          <span style={{ fontFamily: font.mono, fontSize: font.size.sm }}>{ticketId}</span>
        </DetailRow>
        <DetailRow label={isSpanish ? 'Título' : 'Title'}>{ticketTitle}</DetailRow>
        <DetailRow label={isSpanish ? 'Categoría' : 'Category'}>
          <Badge bg={palette.infoBg} color={palette.headingAlt}>
            {category}
          </Badge>
        </DetailRow>
        <DetailRow label={isSpanish ? 'Prioridad' : 'Priority'} isLast>
          <Badge bg={priColor.bg} color={priColor.text}>
            {priority}
          </Badge>
        </DetailRow>
      </InfoCard>

      {/* Description block */}
      <div
        style={{
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: '8px',
          padding: space['7'],
          marginBottom: space['8'],
        }}
      >
        <p
          style={{
            margin: 0,
            color: palette.secondary,
            fontWeight: font.weight.semibold,
            fontSize: font.size.sm,
            fontFamily: font.family,
            marginBottom: space['3'],
          }}
        >
          {isSpanish ? 'Descripción del Problema' : 'Problem Description'}
        </p>
        <p
          style={{
            margin: 0,
            color: palette.body,
            fontSize: font.size.base,
            fontFamily: font.family,
            whiteSpace: 'pre-line',
            lineHeight: String(font.lineHeight.normal),
          }}
        >
          {description}
        </p>
      </div>

      <Disclaimer>
        {isSpanish
          ? 'Recibirá actualizaciones automáticas cuando cambie el estado de su ticket.'
          : 'You will receive automatic updates when your ticket status changes.'}
      </Disclaimer>
    </EmailWrapper>
  );
};
