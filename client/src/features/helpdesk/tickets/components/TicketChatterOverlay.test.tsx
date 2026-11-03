import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TicketChatterOverlay } from './TicketChatterOverlay';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en_US' },
  }),
}));

describe('TicketChatterOverlay', () => {
  const baseProps = {
    responses: [
      {
        id: 'resp-1',
        ticket_id: 't-1',
        tenant_id: 'tenant-1',
        user_id: 'u-1',
        user_name: 'Tech User',
        user_role: 'TECHNICIAN',
        message: 'Hello, this is tech support.',
        is_internal: false,
        created_at: new Date().toISOString(),
        files: [],
      },
    ],
    user: {
      id: 'u-1',
      name: 'Tech User',
      email: 'tech@example.com',
      role: 'TECHNICIAN' as const,
      tenantId: 'tenant-1',
      language: 'en_US',
    },
    responseText: '',
    setResponseText: vi.fn(),
    responseFiles: [],
    setResponseFiles: vi.fn(),
    isInternalNote: false,
    setIsInternalNote: vi.fn(),
    responseFeedback: null,
    sendingResponse: false,
    onSendResponse: vi.fn(),
    onPreviewFile: vi.fn(),
  };

  it('renders floating bottom-right launcher button when collapsed', () => {
    const onOpenChange = vi.fn();
    render(
      <TicketChatterOverlay
        {...baseProps}
        isOpen={false}
        onOpenChange={onOpenChange}
      />
    );

    // Launcher button with conversation text and badge
    const launcher = screen.getByRole('button', { name: 'ticketDetail.toggleChatter' });
    expect(launcher).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();

    // Clicking launcher opens the overlay
    fireEvent.click(launcher);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('renders floating docked card with minimize and close controls when open', () => {
    const onOpenChange = vi.fn();
    render(
      <TicketChatterOverlay
        {...baseProps}
        isOpen={true}
        onOpenChange={onOpenChange}
      />
    );

    // Should display conversation messages
    expect(screen.getByText('Hello, this is tech support.')).toBeDefined();

    // Should display minimize and close header buttons
    const minimizeBtn = screen.getByTitle('ticketDetail.collapseChatter');
    const closeBtn = screen.getByTitle('ticketDetail.closeChatter');
    const maximizeBtn = screen.getByTitle('ticketDetail.maximizeChatter');

    expect(minimizeBtn).toBeDefined();
    expect(closeBtn).toBeDefined();
    expect(maximizeBtn).toBeDefined();

    // Clicking minimize calls onOpenChange(false)
    fireEvent.click(minimizeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('toggles maximize and restore state', () => {
    render(
      <TicketChatterOverlay
        {...baseProps}
        isOpen={true}
        onOpenChange={vi.fn()}
      />
    );

    const maximizeBtn = screen.getByTitle('ticketDetail.maximizeChatter');
    fireEvent.click(maximizeBtn);

    // Title should flip to restoreChatter
    expect(screen.getByTitle('ticketDetail.restoreChatter')).toBeDefined();
  });
});
