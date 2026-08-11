import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketCreate: vi.fn(),
    ticketFindById: vi.fn(),
    ticketAssignTech: vi.fn(),
    countClientTicketsInCurrentMonth: vi.fn(),
    countEquipmentTicketsInCurrentMonth: vi.fn(),
    findPendingEscalations: vi.fn(),
    eventCreate: vi.fn(),
    userFindById: vi.fn(),
    subFindByClient: vi.fn(),
    planFindById: vi.fn(),
    getNextTechnician: vi.fn(),
    onTicketCreated: vi.fn(),
    responseFindByTicket: vi.fn(),
  };
});

vi.mock('../repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      create: mocks.ticketCreate,
      findById: mocks.ticketFindById,
      assignTechnician: mocks.ticketAssignTech,
      countClientTicketsInCurrentMonth: mocks.countClientTicketsInCurrentMonth,
      countEquipmentTicketsInCurrentMonth: mocks.countEquipmentTicketsInCurrentMonth,
      findPendingEscalations: mocks.findPendingEscalations,
    },
  };
});

vi.mock('../repositories/TicketEventRepository', () => {
  return {
    ticketEventRepository: {
      create: mocks.eventCreate,
    },
  };
});

vi.mock('../repositories/TicketResponseRepository', () => {
  return {
    ticketResponseRepository: {
      create: vi.fn(),
      findByTicket: mocks.responseFindByTicket,
    },
  };
});

vi.mock('../repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: mocks.userFindById,
    },
  };
});

vi.mock('../repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findByClient: mocks.subFindByClient,
    },
  };
});

vi.mock('../repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.planFindById,
    },
  };
});

vi.mock('./AssignmentService', () => {
  return {
    assignmentService: {
      getNextTechnician: mocks.getNextTechnician,
    },
  };
});

vi.mock('./NotificationService', () => {
  return {
    notificationService: {
      onTicketCreated: mocks.onTicketCreated,
      onTicketStatusChanged: vi.fn(),
      onTicketAssigned: vi.fn(),
      onTicketResponseCreated: vi.fn(),
    },
  };
});

import { ticketService } from './TicketService';
import { TicketCategory, TicketPriority, TicketStatus } from '../types';

describe('TicketService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTicket', () => {
    const createInput = {
      title: 'Server is down',
      description: 'Main server stopped responding',
      category: TicketCategory.SERVICE_OUTAGE,
      priority: TicketPriority.HIGH,
    };
    const clientId = 'client-123';
    const tenantId = 'tenant-456';

    it('should create ticket successfully when under ticket limit', async () => {
      mocks.subFindByClient.mockResolvedValue([
        { id: 'sub-1', plan: 'PL-001', status: 'ACTIVE' },
      ]);
      mocks.planFindById.mockResolvedValue({
        id: 'PL-001',
        features: [
          { code: 'HELPDESK_SUPPORT', included: true, params: { type: '8x5', limit: '5' } },
        ],
      });
      mocks.countClientTicketsInCurrentMonth.mockResolvedValue(2);

      const createdTicket = {
        id: 'ticket-1',
        ...createInput,
        client_id: clientId,
        tenant_id: tenantId,
        status: TicketStatus.OPEN,
      };
      mocks.ticketCreate.mockResolvedValue(createdTicket);
      mocks.getNextTechnician.mockResolvedValue(null);
      mocks.userFindById.mockResolvedValue({ id: clientId, name: 'Client User' });

      const result = await ticketService.createTicket(createInput, clientId, tenantId);

      expect(mocks.countClientTicketsInCurrentMonth).toHaveBeenCalledWith(clientId);
      expect(mocks.ticketCreate).toHaveBeenCalled();
      expect(result).toEqual(createdTicket);
    });

    it('should throw forbidden AppError when device ticket limit is reached', async () => {
      const equipmentId = 'equip-999';
      const inputWithEquip = { ...createInput, equipmentId };

      mocks.subFindByClient.mockResolvedValue([
        { id: 'sub-1', plan: 'PL-001', status: 'ACTIVE' },
      ]);
      mocks.planFindById.mockResolvedValue({
        id: 'PL-001',
        features: [
          { code: 'HELPDESK_SUPPORT', included: true, params: { type: '8x5', limit: '5' } },
        ],
      });
      mocks.countEquipmentTicketsInCurrentMonth.mockResolvedValue(5);

      await expect(
        ticketService.createTicket(inputWithEquip, clientId, tenantId)
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'TICKET_LIMIT_EXCEEDED',
      });

      expect(mocks.countEquipmentTicketsInCurrentMonth).toHaveBeenCalledWith(equipmentId);
      expect(mocks.ticketCreate).not.toHaveBeenCalled();
    });

    it('should allow ticket creation when device ticket count is under limit', async () => {
      const equipmentId = 'equip-999';
      const inputWithEquip = { ...createInput, equipmentId };

      mocks.subFindByClient.mockResolvedValue([
        { id: 'sub-1', plan: 'PL-001', status: 'ACTIVE' },
      ]);
      mocks.planFindById.mockResolvedValue({
        id: 'PL-001',
        features: [
          { code: 'HELPDESK_SUPPORT', included: true, params: { type: '8x5', limit: '5' } },
        ],
      });
      mocks.countEquipmentTicketsInCurrentMonth.mockResolvedValue(3);

      const createdTicket = {
        id: 'ticket-1',
        ...inputWithEquip,
        client_id: clientId,
        tenant_id: tenantId,
        status: TicketStatus.OPEN,
      };
      mocks.ticketCreate.mockResolvedValue(createdTicket);
      mocks.getNextTechnician.mockResolvedValue(null);
      mocks.userFindById.mockResolvedValue({ id: clientId, name: 'Client User' });

      const result = await ticketService.createTicket(inputWithEquip, clientId, tenantId);

      expect(mocks.countEquipmentTicketsInCurrentMonth).toHaveBeenCalledWith(equipmentId);
      expect(result).toEqual(createdTicket);
    });

    it('should allow ticket creation when limit is Unlimited', async () => {
      mocks.subFindByClient.mockResolvedValue([
        { id: 'sub-1', plan: 'PL-001', status: 'ACTIVE' },
      ]);
      mocks.planFindById.mockResolvedValue({
        id: 'PL-001',
        features: [
          { code: 'HELPDESK_SUPPORT', included: true, params: { type: '8x5', limit: 'Unlimited' } },
        ],
      });

      const createdTicket = {
        id: 'ticket-1',
        ...createInput,
        client_id: clientId,
        tenant_id: tenantId,
        status: TicketStatus.OPEN,
      };
      mocks.ticketCreate.mockResolvedValue(createdTicket);
      mocks.getNextTechnician.mockResolvedValue(null);
      mocks.userFindById.mockResolvedValue({ id: clientId, name: 'Client User' });

      const result = await ticketService.createTicket(createInput, clientId, tenantId);

      expect(mocks.countClientTicketsInCurrentMonth).not.toHaveBeenCalled();
      expect(result).toEqual(createdTicket);
    });

    it('should allow ticket creation when client has no active subscription', async () => {
      mocks.subFindByClient.mockResolvedValue([]);

      const createdTicket = {
        id: 'ticket-1',
        ...createInput,
        client_id: clientId,
        tenant_id: tenantId,
        status: TicketStatus.OPEN,
      };
      mocks.ticketCreate.mockResolvedValue(createdTicket);
      mocks.getNextTechnician.mockResolvedValue(null);
      mocks.userFindById.mockResolvedValue({ id: clientId, name: 'Client User' });

      const result = await ticketService.createTicket(createInput, clientId, tenantId);

      expect(result).toEqual(createdTicket);
    });
  });

  describe('enforceEscalation', () => {
    const buildTicket = (overrides: Partial<any> = {}) => ({
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

    it('escalates an unworked CRITICAL ticket older than 10 minutes to a Tier 2 specialist', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.getNextTechnician.mockResolvedValue({ id: 'tech-tier2', name: 'Senior', specialty: 'Tier 2' });
      mocks.ticketAssignTech.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-tier2' }));
      mocks.ticketFindById.mockResolvedValueOnce(buildTicket()).mockResolvedValueOnce(
        buildTicket({ assigned_tech_id: 'tech-tier2' })
      );

      const result = await ticketService.enforceEscalation('ticket-escal-1');

      expect(mocks.getNextTechnician).toHaveBeenCalledWith(TicketCategory.SERVICE_OUTAGE, 'Tier 2', TicketPriority.CRITICAL);
      expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-escal-1', 'tech-tier2');
      expect(mocks.eventCreate).toHaveBeenCalledWith(
        expect.objectContaining({ notes: expect.stringContaining('Escalated to Tier 2') })
      );
      expect(result?.assigned_tech_id).toBe('tech-tier2');
    });

    it('does not escalate a ticket still within its priority SLA threshold', async () => {
      mocks.ticketFindById.mockResolvedValue(
        buildTicket({ created_at: new Date(Date.now() - 5 * 60 * 1000) })
      );

      const result = await ticketService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.getNextTechnician).not.toHaveBeenCalled();
      expect(mocks.ticketAssignTech).not.toHaveBeenCalled();
    });

    it('skips escalation when the ticket is already assigned to a Tier 2 specialist', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-tier2' }));
      mocks.userFindById.mockResolvedValue({ id: 'tech-tier2', name: 'Senior', specialty: 'Tier 2' });
      mocks.responseFindByTicket.mockResolvedValue([]);

      const result = await ticketService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.getNextTechnician).not.toHaveBeenCalled();
    });

    it('skips escalation when the ticket has been worked (has responses)', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-1' }));
      mocks.userFindById.mockResolvedValue({ id: 'tech-1', name: 'Alice', specialty: null });
      mocks.responseFindByTicket.mockResolvedValue([{ id: 'resp-1' }]);

      const result = await ticketService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.getNextTechnician).not.toHaveBeenCalled();
    });

    it('does not escalate a non-OPEN ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ status: TicketStatus.IN_PROGRESS }));

      const result = await ticketService.enforceEscalation('ticket-escal-1');

      expect(result).toBeNull();
      expect(mocks.getNextTechnician).not.toHaveBeenCalled();
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
      mocks.ticketFindById.mockResolvedValue({
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
      mocks.getNextTechnician.mockResolvedValue({ id: 'tech-tier2', name: 'Senior', specialty: 'Tier 2' });
      mocks.ticketAssignTech.mockResolvedValue({
        id: 'ticket-a',
        assigned_tech_id: 'tech-tier2',
      });

      const result = await ticketService.processPendingEscalations();

      expect(result.escalated).toBe(1);
      expect(mocks.getNextTechnician).toHaveBeenCalledWith(TicketCategory.REPAIR, 'Tier 2', TicketPriority.HIGH);
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

      const result = await ticketService.processPendingEscalations('tenant-456');

      expect(result.escalated).toBe(0);
      expect(mocks.getNextTechnician).not.toHaveBeenCalled();
    });
  });
});
