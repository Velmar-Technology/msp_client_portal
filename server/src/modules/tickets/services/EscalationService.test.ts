import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    ticketAssignTech: vi.fn(),
    eventCreate: vi.fn(),
    userFindById: vi.fn(),
    responseFindByTicket: vi.fn(),
    findPendingEscalations: vi.fn(),
    assignNext: vi.fn(),
    onTicketAssigned: vi.fn(),
  };
});

// Mock businessHours to use raw wall-clock time so escalation tests remain
// deterministic regardless of when they run (weekends, holidays, after-hours).
// Business hours math is exercised by businessHours.test.ts independently.
vi.mock('@shared/utils/businessHours', () => ({
  calculateElapsedBusinessMs: (startDate: Date, endDate: Date = new Date()) =>
    endDate.getTime() - startDate.getTime(),
}));

vi.mock('@modules/tickets/repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      assignTechnician: mocks.ticketAssignTech,
      findPendingEscalations: mocks.findPendingEscalations,
    },
  };
});

vi.mock('@modules/tickets/repositories/TicketEventRepository', () => {
  return {
    ticketEventRepository: {
      create: mocks.eventCreate,
    },
  };
});

vi.mock('@modules/tickets/repositories/TicketResponseRepository', () => {
  return {
    ticketResponseRepository: {
      findByTicket: mocks.responseFindByTicket,
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

vi.mock('./AssignmentService', () => {
  return {
    assignmentService: {
      assignNext: mocks.assignNext,
    },
  };
});

vi.mock('@modules/notifications/services/NotificationService', () => {
  return {
    notificationService: {
      onTicketAssigned: mocks.onTicketAssigned,
    },
  };
});

import { escalationService, EscalationService } from './EscalationService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus } from '@shared/types';

describe('EscalationService', () => {
  const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'ticket-escal-1',
    title: 'Server is down',
    description: 'Main server stopped responding',
    category: TicketCategory.SERVICE_OUTAGE,
    priority: TicketPriority.CRITICAL,
    status: TicketStatus.OPEN,
    client_id: 'client-123',
    assigned_tech_id: null,
    equipment_id: null,
    tenant_id: 'tenant-456',
    created_at: new Date(Date.now() - 11 * 60 * 1000),
    updated_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enforceEscalation', () => {
    it('escalates an unworked CRITICAL ticket older than 10 minutes to a Tier 2 specialist', async () => {
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket());
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket({ assigned_tech_id: 'tech-tier2' }));
      mocks.assignNext.mockResolvedValue({ id: 'tech-tier2', name: 'Senior', specialty: 'Tier 2' });
      mocks.ticketAssignTech.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-tier2' }));

      const result = await escalationService.enforceEscalation('ticket-escal-1');

      expect(mocks.assignNext).toHaveBeenCalledWith(
        TicketCategory.SERVICE_OUTAGE,
        'Tier 2',
        TicketPriority.CRITICAL
      );
      expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-escal-1', 'tech-tier2');
      expect(mocks.eventCreate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: expect.stringContaining('Escalated to Tier 2') })
      );
      expect(mocks.onTicketAssigned).toHaveBeenCalled();
      expect(result?.assigned_tech_id).toBe('tech-tier2');
    });

    it('does not escalate a ticket still within its priority SLA threshold', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ created_at: new Date(Date.now() - 5 * 60 * 1000) }));

      const result = await escalationService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.assignNext).not.toHaveBeenCalled();
      expect(mocks.ticketAssignTech).not.toHaveBeenCalled();
    });

    it('skips escalation when the ticket is already assigned to a Tier 2 specialist', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-tier2' }));
      mocks.userFindById.mockResolvedValue({ id: 'tech-tier2', name: 'Senior', specialty: 'Tier 2' });
      mocks.responseFindByTicket.mockResolvedValue([]);

      const result = await escalationService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.assignNext).not.toHaveBeenCalled();
    });

    it('skips escalation when the ticket has been worked (has responses)', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-1' }));
      mocks.userFindById.mockResolvedValue({ id: 'tech-1', name: 'Alice', specialty: null });
      mocks.responseFindByTicket.mockResolvedValue([{ id: 'resp-1' }]);

      const result = await escalationService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.assignNext).not.toHaveBeenCalled();
    });

    it('does not escalate a non-OPEN ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ status: TicketStatus.IN_PROGRESS }));

      const result = await escalationService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.assignNext).not.toHaveBeenCalled();
    });

    it('throws a not-found error for a missing ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(null);

      await expect(escalationService.enforceEscalation('missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('processPendingEscalations', () => {
    it('escalates eligible pending candidates and returns the count', async () => {
      mocks.findPendingEscalations.mockResolvedValue([
        {
          id: 'ticket-a',
          priority: TicketPriority.HIGH,
          status: TicketStatus.OPEN,
          category: TicketCategory.REPAIR,
          assigned_tech_id: null,
          tenant_id: 'tenant-456',
          created_at: new Date(Date.now() - 25 * 60 * 1000),
          responseCount: 0,
        },
      ]);
      mocks.ticketFindById.mockResolvedValueOnce({
        id: 'ticket-a',
        title: 'Slow network',
        description: 'Network slowness reported',
        category: TicketCategory.REPAIR,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        client_id: 'client-123',
        assigned_tech_id: null,
        equipment_id: null,
        tenant_id: 'tenant-456',
        created_at: new Date(Date.now() - 25 * 60 * 1000),
        updated_at: new Date(),
      });
      mocks.ticketFindById.mockResolvedValueOnce({
        id: 'ticket-a',
        assigned_tech_id: 'tech-tier2',
      });
      mocks.assignNext.mockResolvedValue({ id: 'tech-tier2', name: 'Senior', specialty: 'Tier 2' });
      mocks.ticketAssignTech.mockResolvedValue({ id: 'ticket-a', assigned_tech_id: 'tech-tier2' });

      const result = await escalationService.processPendingEscalations();

      expect(result.escalated).toBe(1);
      expect(mocks.assignNext).toHaveBeenCalledWith(TicketCategory.REPAIR, 'Tier 2', TicketPriority.HIGH);
    });

    it('honors the tenantId scope when sweeping candidates', async () => {
      mocks.findPendingEscalations.mockResolvedValue([
        {
          id: 'ticket-b',
          priority: TicketPriority.LOW,
          status: TicketStatus.OPEN,
          category: TicketCategory.REPAIR,
          assigned_tech_id: null,
          tenant_id: 'tenant-other',
          created_at: new Date(Date.now() - 130 * 60 * 1000),
          responseCount: 0,
        },
      ]);

      const result = await escalationService.processPendingEscalations('tenant-456');

      expect(result.escalated).toBe(0);
      expect(mocks.assignNext).not.toHaveBeenCalled();
    });
  });

  it('exposes a singleton instance', () => {
    expect(escalationService).toBeInstanceOf(EscalationService);
  });
});
