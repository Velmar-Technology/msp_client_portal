import { render, screen, act } from '@testing-library/react';
import { TicketDetailPage } from './TicketDetailPage';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import { useSLATimer } from '@/hooks/useSLATimer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en_US' },
  }),
}));

vi.mock('@/hooks/useTicketDetail');
vi.mock('@/hooks/useSLATimer');

describe('TicketDetailPage - Button Blocking for CANCELLED Tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSLATimer).mockReturnValue({
      isApplicable: false,
      isExpired: false,
      formattedTime: '00:00:00',
      remainingMs: 0,
      totalMs: 0,
      progress: 0,
    });
  });

  test('does not render Reopen or action buttons when ticket is CANCELLED', () => {
    vi.mocked(useTicketDetail).mockReturnValue({
      t: (key: string) => key,
      i18n: { language: 'en_US' } as any,
      user: { id: 'user-1', role: 'CLIENT', name: 'John Doe', email: 'john@example.com' } as any,
      ticket: {
        id: 'ticket-1',
        title: 'Cancelled Printer Issue',
        description: 'Printer cannot be found',
        status: 'CANCELLED',
        priority: 'MEDIUM',
        category: 'HARDWARE',
        created_at: new Date().toISOString(),
        client_name: 'John Doe',
      } as any,
      responses: [],
      timeline: [],
      attachments: [],
      technicians: [],
      loading: false,
      loadingTechs: false,
      assigning: false,
      statusUpdating: false,
      sendingResponse: false,
      uploading: false,
      responseText: '',
      setResponseText: vi.fn(),
      responseFiles: [],
      setResponseFiles: vi.fn(),
      responseFeedback: null,
      selectedTechId: '',
      setSelectedTechId: vi.fn(),
      assignMessage: null,
      uploadError: null,
      previewFile: null,
      setPreviewFile: vi.fn(),
      isDragOver: false,
      setIsDragOver: vi.fn(),
      canAssign: false,
      getStatusLabel: (s: string) => s,
      getPriorityLabel: (p: string) => p,
      getCategoryLabel: (c: string) => c,
      handleStatusChange: vi.fn(),
      handleAssign: vi.fn(),
      handleSendResponse: vi.fn(),
      handleFileUpload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TicketDetailPage />
      </MemoryRouter>
    );

    expect(screen.queryByText('ticketDetail.reopen')).not.toBeInTheDocument();
    expect(screen.queryByText('tickets.cancelTicket')).not.toBeInTheDocument();
  });

  test('renders cancel button for CLIENT when ticket is OPEN', () => {
    vi.mocked(useTicketDetail).mockReturnValue({
      t: (key: string) => key,
      i18n: { language: 'en_US' } as any,
      user: { id: 'user-1', role: 'CLIENT', name: 'John Doe', email: 'john@example.com' } as any,
      ticket: {
        id: 'ticket-2',
        title: 'Open Network Issue',
        description: 'Network down',
        status: 'OPEN',
        priority: 'HIGH',
        category: 'NETWORK',
        created_at: new Date().toISOString(),
        client_name: 'John Doe',
      } as any,
      responses: [],
      timeline: [],
      attachments: [],
      technicians: [],
      loading: false,
      loadingTechs: false,
      assigning: false,
      statusUpdating: false,
      sendingResponse: false,
      uploading: false,
      responseText: '',
      setResponseText: vi.fn(),
      responseFiles: [],
      setResponseFiles: vi.fn(),
      responseFeedback: null,
      selectedTechId: '',
      setSelectedTechId: vi.fn(),
      assignMessage: null,
      uploadError: null,
      previewFile: null,
      setPreviewFile: vi.fn(),
      isDragOver: false,
      setIsDragOver: vi.fn(),
      canAssign: false,
      getStatusLabel: (s: string) => s,
      getPriorityLabel: (p: string) => p,
      getCategoryLabel: (c: string) => c,
      handleStatusChange: vi.fn(),
      handleAssign: vi.fn(),
      handleSendResponse: vi.fn(),
      handleFileUpload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TicketDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText('tickets.cancelTicket')).toBeInTheDocument();
  });

  test('renders invalid ticket ID error view when ticket is null and not loading', () => {
    vi.mocked(useTicketDetail).mockReturnValue({
      t: (key: string) => key,
      i18n: { language: 'en_US' } as any,
      user: { id: 'user-1', role: 'CLIENT', name: 'John Doe', email: 'john@example.com' } as any,
      ticket: null,
      error: {
        title: 'Ticket ID Invalid',
        message: 'The provided ticket ID is not valid. Please verify the URL and try again.',
      },
      responses: [],
      timeline: [],
      attachments: [],
      technicians: [],
      loading: false,
      loadingTechs: false,
      assigning: false,
      statusUpdating: false,
      sendingResponse: false,
      uploading: false,
      responseText: '',
      setResponseText: vi.fn(),
      responseFiles: [],
      setResponseFiles: vi.fn(),
      responseFeedback: null,
      selectedTechId: '',
      setSelectedTechId: vi.fn(),
      assignMessage: null,
      uploadError: null,
      previewFile: null,
      setPreviewFile: vi.fn(),
      isDragOver: false,
      setIsDragOver: vi.fn(),
      canAssign: false,
      getStatusLabel: (s: string) => s,
      getPriorityLabel: (p: string) => p,
      getCategoryLabel: (c: string) => c,
      handleStatusChange: vi.fn(),
      handleAssign: vi.fn(),
      handleSendResponse: vi.fn(),
      handleFileUpload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <TicketDetailPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ticket ID Invalid')).toBeInTheDocument();
    expect(screen.getByText('ticketDetail.backToTickets')).toBeInTheDocument();
  });

  test('defers skeleton rendering initially and shows it after SKELETON_DISPLAY_DELAY_MS', () => {
    vi.useFakeTimers();

    vi.mocked(useTicketDetail).mockReturnValue({
      t: (key: string) => key,
      i18n: { language: 'en_US' } as any,
      user: { id: 'user-1', role: 'CLIENT', name: 'John Doe', email: 'john@example.com' } as any,
      ticket: null,
      error: null,
      responses: [],
      timeline: [],
      attachments: [],
      technicians: [],
      loading: true,
      loadingTechs: false,
      assigning: false,
      statusUpdating: false,
      sendingResponse: false,
      uploading: false,
      responseText: '',
      setResponseText: vi.fn(),
      responseFiles: [],
      setResponseFiles: vi.fn(),
      responseFeedback: null,
      selectedTechId: '',
      setSelectedTechId: vi.fn(),
      assignMessage: null,
      uploadError: null,
      previewFile: null,
      setPreviewFile: vi.fn(),
      isDragOver: false,
      setIsDragOver: vi.fn(),
      canAssign: false,
      getStatusLabel: (s: string) => s,
      getPriorityLabel: (p: string) => p,
      getCategoryLabel: (c: string) => c,
      handleStatusChange: vi.fn(),
      handleAssign: vi.fn(),
      handleSendResponse: vi.fn(),
      handleFileUpload: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <TicketDetailPage />
      </MemoryRouter>
    );

    // Initially within threshold, skeleton should not be rendered
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();

    // Advance time past threshold
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Skeleton should now be visible
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();

    vi.useRealTimers();
  });
});

