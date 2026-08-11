import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketCreate: vi.fn(),
    ticketFindById: vi.fn(),
    ticketAssignTech: vi.fn(),
    countClientTicketsInCurrentMonth: vi.fn(),
    countEquipmentTicketsInCurrentMonth: vi.fn(),
    eventCreate: vi.fn(),
    userFindById: vi.fn(),
    subFindByClient: vi.fn(),
    planFindById: vi.fn(),
    getNextTechnician: vi.fn(),
    onTicketCreated: vi.fn(),
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
      findByTicket: vi.fn(),
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
});
