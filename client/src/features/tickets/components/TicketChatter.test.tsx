import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TicketChatterComposer } from './TicketChatterComposer';
import { TicketChatter } from './TicketChatter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en_US' },
  }),
}));

describe('TicketChatterComposer', () => {
  it('renders both Send Message and Log Note tabs for technicians', () => {
    render(
      <TicketChatterComposer
        responseText=""
        setResponseText={vi.fn()}
        responseFiles={[]}
        setResponseFiles={vi.fn()}
        isInternalNote={false}
        setIsInternalNote={vi.fn()}
        sendingResponse={false}
        responseFeedback={null}
        onSendResponse={vi.fn()}
        userRole="TECHNICIAN"
      />
    );

    expect(screen.getByText('ticketDetail.sendMessageTab')).toBeDefined();
    expect(screen.getByText('ticketDetail.logNoteTab')).toBeDefined();
  });

  it('hides the Log Note tab for clients', () => {
    render(
      <TicketChatterComposer
        responseText=""
        setResponseText={vi.fn()}
        responseFiles={[]}
        setResponseFiles={vi.fn()}
        isInternalNote={false}
        setIsInternalNote={vi.fn()}
        sendingResponse={false}
        responseFeedback={null}
        onSendResponse={vi.fn()}
        userRole="CLIENT"
      />
    );

    expect(screen.queryByText('ticketDetail.logNoteTab')).toBeNull();
  });

  it('toggles to internal note mode when clicking Log Note tab', () => {
    const setIsInternalNote = vi.fn();
    render(
      <TicketChatterComposer
        responseText=""
        setResponseText={vi.fn()}
        responseFiles={[]}
        setResponseFiles={vi.fn()}
        isInternalNote={false}
        setIsInternalNote={setIsInternalNote}
        sendingResponse={false}
        responseFeedback={null}
        onSendResponse={vi.fn()}
        userRole="TECHNICIAN"
      />
    );

    const logNoteTab = screen.getByText('ticketDetail.logNoteTab');
    fireEvent.click(logNoteTab);

    expect(setIsInternalNote).toHaveBeenCalledWith(true);
  });
});

describe('TicketChatter', () => {
  const mockResponses = [
    {
      id: 'resp-1',
      ticket_id: 'ticket-1',
      user_id: 'user-1',
      message: 'Hello, customer!',
      tenant_id: 'ten-1',
      created_at: new Date().toISOString(),
      user_name: 'Tech Alice',
      user_role: 'TECHNICIAN',
      is_internal: false,
    },
    {
      id: 'resp-2',
      ticket_id: 'ticket-1',
      user_id: 'user-1',
      message: 'Secret staff observation',
      tenant_id: 'ten-1',
      created_at: new Date().toISOString(),
      user_name: 'Tech Alice',
      user_role: 'TECHNICIAN',
      is_internal: true,
    },
  ];

  it('renders internal notes with the staff note badge', () => {
    render(
      <TicketChatter
        responses={mockResponses}
        user={{ id: 'user-2', email: 'tech2@test.com', role: 'TECHNICIAN', tenantId: 'ten-1', name: 'Tech Bob', language: 'en_US' }}
        responseText=""
        setResponseText={vi.fn()}
        responseFiles={[]}
        setResponseFiles={vi.fn()}
        isInternalNote={false}
        setIsInternalNote={vi.fn()}
        responseFeedback={null}
        sendingResponse={false}
        onSendResponse={vi.fn()}
        onPreviewFile={vi.fn()}
      />
    );

    expect(screen.getByText('Hello, customer!')).toBeDefined();
    expect(screen.getByText('Secret staff observation')).toBeDefined();
    expect(screen.getByText('ticketDetail.internalNoteBadge')).toBeDefined();
  });
});
