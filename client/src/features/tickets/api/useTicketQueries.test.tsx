import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTickets, useCreateTicket, useUpdateTicketStatus } from './useTicketQueries';
import { ticketService } from './ticketService';
import { TicketCategory, TicketPriority, TicketStatus } from '@shared/contracts';

vi.mock('./ticketService', () => ({
  ticketService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTicketQueries hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches ticket list and maps pagination', async () => {
    const mockTickets = [
      {
        id: 'ticket-1',
        title: 'Printer down',
        description: 'LaserJet error 50.4',
        category: TicketCategory.REPAIR,
        status: TicketStatus.OPEN,
        priority: TicketPriority.HIGH,
        client_id: 'client-1',
        assigned_tech_id: null,
        equipment_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    vi.mocked(ticketService.getAll).mockResolvedValueOnce({
      data: mockTickets,
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    const { result } = renderHook(() => useTickets({ page: 1, limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.tickets).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.tickets[0].title).toBe('Printer down');
    expect(ticketService.getAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  it('executes create ticket mutation', async () => {
    const payload = {
      title: 'New WiFi Issue',
      description: 'Cannot connect to 5GHz AP in floor 3',
      category: TicketCategory.HELPDESK,
      priority: TicketPriority.MEDIUM,
    };

    vi.mocked(ticketService.create).mockResolvedValueOnce({
      id: 'ticket-2',
      ...payload,
      status: TicketStatus.OPEN,
      client_id: 'client-1',
      assigned_tech_id: null,
      equipment_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { result } = renderHook(() => useCreateTicket(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ticketService.create).toHaveBeenCalledWith(payload);
  });

  it('executes status update mutation', async () => {
    vi.mocked(ticketService.updateStatus).mockResolvedValueOnce({
      id: 'ticket-1',
      status: TicketStatus.RESOLVED,
      title: 'Printer down',
      description: 'Fixed paper jam',
      category: TicketCategory.REPAIR,
      priority: TicketPriority.HIGH,
      client_id: 'client-1',
      assigned_tech_id: null,
      equipment_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { result } = renderHook(() => useUpdateTicketStatus(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      id: 'ticket-1',
      data: { status: TicketStatus.RESOLVED, notes: 'Fixed' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ticketService.updateStatus).toHaveBeenCalledWith('ticket-1', TicketStatus.RESOLVED, 'Fixed');
  });
});
