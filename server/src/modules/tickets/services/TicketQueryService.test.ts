import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    findWithFilters: vi.fn(),
    countByStatus: vi.fn(),
    dbSelect: vi.fn(),
  };
});

vi.mock('@shared/db', () => ({
  db: {
    select: mocks.dbSelect,
  },
  tickets: {
    id: 'id',
    equipment_id: 'equipment_id',
    tenant_id: 'tenant_id',
    status: 'status',
    created_at: 'created_at',
  },
}));

vi.mock('@modules/tickets/repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      findWithFilters: mocks.findWithFilters,
      countByStatus: mocks.countByStatus,
    },
  };
});

import { ticketQueryService, TicketQueryService } from './TicketQueryService';
import { Ticket, TicketCategory, TicketFilters, TicketPriority, TicketStatus, UserContext, UserRole } from '@shared/types';

describe('TicketQueryService', () => {
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

  describe('getTicketById', () => {
    it('returns the ticket when the client owns the tenant scope', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());

      const result = await ticketQueryService.getTicketById('ticket-1', clientCtx);

      expect(result.id).toBe('ticket-1');
    });

    it('throws a not-found error for a missing ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(null);

      await expect(ticketQueryService.getTicketById('missing', clientCtx)).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('rejects a client reading a ticket from another tenant', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ tenant_id: 'tenant-other' }));

      await expect(ticketQueryService.getTicketById('ticket-1', clientCtx)).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('lets an admin read tickets from any tenant', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ tenant_id: 'tenant-other' }));

      const result = await ticketQueryService.getTicketById('ticket-1', adminCtx);

      expect(result.id).toBe('ticket-1');
    });
  });

  describe('getTickets', () => {
    const filters: TicketFilters = { page: 1, limit: 20 };

    it('scopes a client list to their tenant', async () => {
      mocks.findWithFilters.mockResolvedValue({ tickets: [buildTicket()], total: 1 });

      await ticketQueryService.getTickets(filters, clientCtx);

      expect(mocks.findWithFilters).toHaveBeenCalledWith({ ...filters, tenantId: 'tenant-456' });
    });

    it('scopes a technician list to their assigned tickets', async () => {
      mocks.findWithFilters.mockResolvedValue({ tickets: [], total: 0 });

      await ticketQueryService.getTickets(filters, technicianCtx);

      expect(mocks.findWithFilters).toHaveBeenCalledWith({ ...filters, assignedTechId: 'tech-1' });
    });

    it('passes admin filters through unchanged', async () => {
      mocks.findWithFilters.mockResolvedValue({ tickets: [], total: 0 });

      await ticketQueryService.getTickets(filters, adminCtx);

      expect(mocks.findWithFilters).toHaveBeenCalledWith(filters);
    });
  });

  describe('getStatusSummary', () => {
    it('counts by client and tenant for a client caller', async () => {
      mocks.countByStatus.mockResolvedValue({ OPEN: 3 });

      const summary = await ticketQueryService.getStatusSummary(clientCtx);

      expect(summary).toEqual({ OPEN: 3 });
      expect(mocks.countByStatus).toHaveBeenCalledWith('client-123', undefined, 'tenant-456');
    });

    it('counts by assigned technician for a technician caller', async () => {
      mocks.countByStatus.mockResolvedValue({ IN_PROGRESS: 2 });

      const summary = await ticketQueryService.getStatusSummary(technicianCtx);

      expect(summary).toEqual({ IN_PROGRESS: 2 });
      expect(mocks.countByStatus).toHaveBeenCalledWith(undefined, 'tech-1', undefined);
    });

    it('counts globally for an admin caller', async () => {
      mocks.countByStatus.mockResolvedValue({});

      await ticketQueryService.getStatusSummary(adminCtx);

      expect(mocks.countByStatus).toHaveBeenCalledWith(undefined, undefined, undefined);
    });
  });

  describe('getActiveTicketForAgent', () => {
    const agentCtx = {
      equipmentId: 'eq-agent-1',
      tenantId: 'tenant-456',
      clientId: 'client-123',
      hostname: 'WORKSTATION-01',
    };

    it('returns active ticket when one is open for this equipment', async () => {
      const mockLimit = vi.fn().mockResolvedValue([{ id: 'ticket-active-1' }]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mocks.dbSelect.mockReturnValue({ from: mockFrom });

      mocks.ticketFindById.mockResolvedValue(buildTicket({ id: 'ticket-active-1', status: TicketStatus.OPEN }));

      const result = await ticketQueryService.getActiveTicketForAgent(agentCtx);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('ticket-active-1');
      expect(mocks.ticketFindById).toHaveBeenCalledWith('ticket-active-1');
    });

    it('returns null when no active ticket exists for this equipment', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mocks.dbSelect.mockReturnValue({ from: mockFrom });

      const result = await ticketQueryService.getActiveTicketForAgent(agentCtx);

      expect(result).toBeNull();
      expect(mocks.ticketFindById).not.toHaveBeenCalled();
    });
  });

  it('exposes a singleton instance', () => {
    expect(ticketQueryService).toBeInstanceOf(TicketQueryService);
  });
});
