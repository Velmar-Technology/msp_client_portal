import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    ticketUpdateStatus: vi.fn(),
    eventCreate: vi.fn(),
    eventFindByTicket: vi.fn(),
    userFindById: vi.fn(),
    onTicketStatusChanged: vi.fn(),
  };
});

vi.mock('@modules/tickets/repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      updateStatus: mocks.ticketUpdateStatus,
    },
  };
});

vi.mock('@modules/tickets/repositories/TicketEventRepository', () => {
  return {
    ticketEventRepository: {
      create: mocks.eventCreate,
      findByTicket: mocks.eventFindByTicket,
    },
  };
});

vi.mock('@modules/auth/repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: mocks.userFindById,
    },
  };
});

vi.mock('@modules/notifications/services/NotificationService', () => {
  return {
    notificationService: {
      onTicketStatusChanged: mocks.onTicketStatusChanged,
    },
  };
});

import { ticketStatusService, TicketStatusService } from './TicketStatusService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, UserContext, UserRole } from '@shared/types';

describe('TicketStatusService', () => {
  const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'ticket-1',
    title: 'Server is down',
    description: 'Main server stopped responding',
    category: TicketCategory.SERVICE_OUTAGE,
    status: TicketStatus.OPEN,
    priority: TicketPriority.HIGH,
    client_id: 'client-123',
    assigned_tech_id: null,
    equipment_id: null,
    tenant_id: 'tenant-456',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const clientCtx: UserContext = { userId: 'client-123', role: UserRole.CLIENT, tenantId: 'tenant-456' };
  const technicianCtx: UserContext = { userId: 'tech-1', role: UserRole.TECHNICIAN, tenantId: 'tenant-456' };
  const adminCtx: UserContext = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-456' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateStatus', () => {
    it('updates the status, logs the transition event, and notifies the client', async () => {
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket());
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket({ status: TicketStatus.IN_PROGRESS }));
      mocks.ticketUpdateStatus.mockResolvedValue(buildTicket({ status: TicketStatus.IN_PROGRESS }));
      mocks.userFindById.mockResolvedValue({ id: 'client-123', name: 'Client User' });

      const result = await ticketStatusService.updateStatus(
        'ticket-1',
        { status: TicketStatus.IN_PROGRESS, notes: 'Investigating' },
        technicianCtx
      );

      expect(mocks.ticketUpdateStatus).toHaveBeenCalledWith('ticket-1', TicketStatus.IN_PROGRESS);
      expect(mocks.eventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-1',
          old_status: TicketStatus.OPEN,
          new_status: TicketStatus.IN_PROGRESS,
          notes: 'Investigating',
          changed_by: 'tech-1',
        })
      );
      expect(mocks.onTicketStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({ status: TicketStatus.IN_PROGRESS }),
        expect.objectContaining({ id: 'client-123' }),
        'Investigating'
      );
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('throws a not-found error for a missing ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(null);

      await expect(
        ticketStatusService.updateStatus('missing', { status: TicketStatus.IN_PROGRESS }, adminCtx)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('rejects an illegal status transition', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ status: TicketStatus.CLOSED }));

      await expect(
        ticketStatusService.updateStatus('ticket-1', { status: TicketStatus.OPEN }, adminCtx)
      ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
      expect(mocks.ticketUpdateStatus).not.toHaveBeenCalled();
    });

    it('forbids a client from applying a non-cancel status', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());

      await expect(
        ticketStatusService.updateStatus('ticket-1', { status: TicketStatus.IN_PROGRESS }, clientCtx)
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mocks.ticketUpdateStatus).not.toHaveBeenCalled();
    });

    it('allows a client to cancel their own ticket within the SLA window', async () => {
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket({ category: TicketCategory.WARRANTY }));
      mocks.ticketFindById.mockResolvedValueOnce(
        buildTicket({ category: TicketCategory.WARRANTY, status: TicketStatus.CANCELLED })
      );
      mocks.ticketUpdateStatus.mockResolvedValue(
        buildTicket({ category: TicketCategory.WARRANTY, status: TicketStatus.CANCELLED })
      );
      mocks.userFindById.mockResolvedValue({ id: 'client-123', name: 'Client User' });

      const result = await ticketStatusService.updateStatus(
        'ticket-1',
        { status: TicketStatus.CANCELLED },
        clientCtx
      );

      expect(result.status).toBe(TicketStatus.CANCELLED);
    });

    it('throws an SLA violation when a warranty ticket is cancelled after 1 hour', async () => {
      const oldTicket = buildTicket({
        category: TicketCategory.WARRANTY,
        created_at: new Date(Date.now() - 90 * 60 * 1000),
      });
      mocks.ticketFindById.mockResolvedValue(oldTicket);

      await expect(
        ticketStatusService.updateStatus('ticket-1', { status: TicketStatus.CANCELLED }, clientCtx)
      ).rejects.toMatchObject({ code: 'SLA_VIOLATION' });
      expect(mocks.ticketUpdateStatus).not.toHaveBeenCalled();
    });

    it('allows an admin to cancel a service outage ticket within the SLA window', async () => {
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket({ category: TicketCategory.SERVICE_OUTAGE }));
      mocks.ticketFindById.mockResolvedValueOnce(
        buildTicket({ category: TicketCategory.SERVICE_OUTAGE, status: TicketStatus.CANCELLED })
      );
      mocks.ticketUpdateStatus.mockResolvedValue(
        buildTicket({ category: TicketCategory.SERVICE_OUTAGE, status: TicketStatus.CANCELLED })
      );
      mocks.userFindById.mockResolvedValue({ id: 'client-123', name: 'Client User' });

      const result = await ticketStatusService.updateStatus(
        'ticket-1',
        { status: TicketStatus.CANCELLED },
        adminCtx
      );

      expect(result.status).toBe(TicketStatus.CANCELLED);
    });
  });

  describe('getTicketTimeline', () => {
    it('returns the event timeline for an accessible ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.eventFindByTicket.mockResolvedValue([
        { id: 'evt-1', ticket_id: 'ticket-1', new_status: TicketStatus.OPEN },
      ]);

      const timeline = await ticketStatusService.getTicketTimeline('ticket-1', clientCtx);

      expect(mocks.eventFindByTicket).toHaveBeenCalledWith('ticket-1');
      expect(timeline).toEqual([{ id: 'evt-1', ticket_id: 'ticket-1', new_status: TicketStatus.OPEN }]);
    });

    it('rejects a client accessing a ticket from another tenant', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ tenant_id: 'tenant-other' }));

      await expect(ticketStatusService.getTicketTimeline('ticket-1', clientCtx)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  it('exposes a singleton instance', () => {
    expect(ticketStatusService).toBeInstanceOf(TicketStatusService);
  });
});
