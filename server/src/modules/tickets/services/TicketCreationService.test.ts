import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketCreate: vi.fn(),
    ticketAssignTech: vi.fn(),
    countClientTicketsInCurrentMonth: vi.fn(),
    countEquipmentTicketsInCurrentMonth: vi.fn(),
    eventCreate: vi.fn(),
    userFindById: vi.fn(),
    subFindByClient: vi.fn(),
    planFindById: vi.fn(),
    enforceTicketLimit: vi.fn(),
    assignNext: vi.fn(),
    onTicketCreated: vi.fn(),
  };
});

vi.mock('@modules/tickets/repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      create: mocks.ticketCreate,
      assignTechnician: mocks.ticketAssignTech,
      countClientTicketsInCurrentMonth: mocks.countClientTicketsInCurrentMonth,
      countEquipmentTicketsInCurrentMonth: mocks.countEquipmentTicketsInCurrentMonth,
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

vi.mock('@modules/auth/repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: mocks.userFindById,
    },
  };
});

vi.mock('@modules/subscriptions/repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findByClient: mocks.subFindByClient,
    },
  };
});

vi.mock('@modules/subscriptions/repositories/PlanRepository', () => {
  return {
    planRepository: {
      findById: mocks.planFindById,
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
      onTicketCreated: mocks.onTicketCreated,
    },
  };
});

vi.mock('@modules/equipment', () => {
  return {
    equipmentRepository: {
      findById: vi.fn(),
    },
  };
});

vi.mock('./TicketQuotaService', () => {
  return {
    ticketQuotaService: {
      enforceTicketLimit: mocks.enforceTicketLimit,
    },
  };
});

import { ticketCreationService, TicketCreationService } from './TicketCreationService';
import { RmmAlertInput, TicketCategory, TicketPriority, TicketStatus, UserContext, UserRole } from '@shared/types';
import { CreateTicketInput } from '@shared/dtos/ticket.dto';

describe('TicketCreationService', () => {
  const createInput = {
    title: 'Server is down',
    description: 'Main server stopped responding',
    category: TicketCategory.SERVICE_OUTAGE,
    priority: TicketPriority.HIGH,
  };
  const ctx: UserContext = { userId: 'client-123', role: UserRole.CLIENT, tenantId: 'tenant-456' };

  const createdTicket = (overrides: Record<string, unknown> = {}) => ({
    id: 'ticket-1',
    ...createInput,
    client_id: ctx.userId,
    tenant_id: ctx.tenantId,
    status: TicketStatus.OPEN,
    assigned_tech_id: null,
    equipment_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTicket', () => {
    it('creates a ticket, logs the OPEN event, and notifies the client', async () => {
      mocks.enforceTicketLimit.mockResolvedValue(undefined);
      const created = createdTicket();
      mocks.ticketCreate.mockResolvedValue(created);
      mocks.assignNext.mockResolvedValue(null);
      mocks.userFindById.mockResolvedValue({ id: ctx.userId, name: 'Client User' });

      const result = await ticketCreationService.createTicket(createInput, ctx);

      expect(mocks.enforceTicketLimit).toHaveBeenCalledWith(ctx.userId, ctx.tenantId, undefined);
      expect(mocks.ticketCreate).toHaveBeenCalledWith({
        title: createInput.title,
        description: createInput.description,
        category: createInput.category,
        priority: createInput.priority,
        client_id: ctx.userId,
        equipment_id: null,
        tenant_id: ctx.tenantId,
      });
      expect(mocks.eventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-1',
          old_status: null,
          new_status: TicketStatus.OPEN,
          changed_by: ctx.userId,
        })
      );
      expect(mocks.onTicketCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-1' }),
        expect.objectContaining({ id: ctx.userId })
      );
      expect(result).toEqual(created);
    });

    it('auto-assigns the next technician when one is available', async () => {
      mocks.ticketCreate.mockResolvedValue(createdTicket());
      mocks.assignNext.mockResolvedValue({ id: 'tech-1', name: 'Alice' });

      const result = await ticketCreationService.createTicket(createInput, ctx);

      expect(mocks.assignNext).toHaveBeenCalledWith(
        TicketCategory.SERVICE_OUTAGE,
        undefined,
        TicketPriority.HIGH
      );
      expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-1', 'tech-1');
      expect(result.assigned_tech_id).toBe('tech-1');
    });

    it('defaults priority to MEDIUM when omitted', async () => {
      mocks.ticketCreate.mockResolvedValue(createdTicket({ priority: TicketPriority.MEDIUM }));
      mocks.assignNext.mockResolvedValue(null);

      const inputWithoutPriority: CreateTicketInput = {
        title: createInput.title,
        description: createInput.description,
        category: createInput.category,
      };
      await ticketCreationService.createTicket(inputWithoutPriority, ctx);

      expect(mocks.assignNext).toHaveBeenCalledWith(
        TicketCategory.SERVICE_OUTAGE,
        undefined,
        TicketPriority.MEDIUM
      );
    });

    it('rejects creation when the client quota is exceeded', async () => {
      mocks.enforceTicketLimit.mockRejectedValue(
        Object.assign(new Error('Monthly ticket limit reached'), { statusCode: 403, code: 'TICKET_LIMIT_EXCEEDED' })
      );

      await expect(ticketCreationService.createTicket(createInput, ctx)).rejects.toMatchObject({
        statusCode: 403,
        code: 'TICKET_LIMIT_EXCEEDED',
      });
      expect(mocks.ticketCreate).not.toHaveBeenCalled();
    });

    it('creates ticket linked to equipment slot when valid and within quota', async () => {
      const { equipmentRepository } = await import('@modules/equipment');
      vi.mocked(equipmentRepository.findById).mockResolvedValue({
        id: 'equip-1',
        tenant_id: ctx.tenantId,
        subscription_id: 'sub-1',
        slot_index: 0,
      } as any);
      mocks.enforceTicketLimit.mockResolvedValue(undefined);
      const created = createdTicket({ equipment_id: 'equip-1' });
      mocks.ticketCreate.mockResolvedValue(created);
      mocks.assignNext.mockResolvedValue(null);
      mocks.userFindById.mockResolvedValue({ id: ctx.userId, name: 'Client User' });

      const result = await ticketCreationService.createTicket({ ...createInput, equipmentId: 'equip-1' }, ctx);

      expect(mocks.enforceTicketLimit).toHaveBeenCalledWith(ctx.userId, ctx.tenantId, 'equip-1');
      expect(mocks.ticketCreate).toHaveBeenCalledWith(expect.objectContaining({
        equipment_id: 'equip-1',
      }));
      expect(result.equipment_id).toBe('equip-1');
    });

    it('rejects creation when equipment slot does not belong to tenant or is not found', async () => {
      const { equipmentRepository } = await import('@modules/equipment');
      vi.mocked(equipmentRepository.findById).mockResolvedValue({
        id: 'equip-foreign',
        tenant_id: 'other-tenant',
        subscription_id: 'sub-2',
        slot_index: 0,
      } as any);

      await expect(
        ticketCreationService.createTicket({ ...createInput, equipmentId: 'equip-foreign' }, ctx)
      ).rejects.toThrow('Equipment device slot not found or unauthorized');
      expect(mocks.ticketCreate).not.toHaveBeenCalled();
    });
  });

  describe('createTicketFromAlert', () => {
    const alertInput: RmmAlertInput = {
      alertType: 'DISK_FULL',
      assetId: 'asset-001',
      clientId: 'client-123',
      tenantId: 'tenant-456',
      executionTimeMs: 0,
      title: 'Disk full on server',
      description: 'Disk usage exceeded 90%',
    };

    it('creates a tagged ticket and routes it to a specialty pool', async () => {
      mocks.ticketCreate.mockResolvedValue(
        createdTicket({ category: TicketCategory.PREVENTATIVE_MAINTENANCE })
      );
      mocks.assignNext.mockResolvedValue({ id: 'tech-2', name: 'Senior' });

      const result = await ticketCreationService.createTicketFromAlert(alertInput, {
        status: TicketStatus.OPEN,
        category: TicketCategory.PREVENTATIVE_MAINTENANCE,
        priority: TicketPriority.MEDIUM,
        tag: '[FLAPPING_ALERT]',
        assignment: { mode: 'specialty', specialty: 'Tier 2' },
      });

      expect(mocks.ticketCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '[FLAPPING_ALERT] Disk full on server',
          description: 'Disk usage exceeded 90%',
          category: TicketCategory.PREVENTATIVE_MAINTENANCE,
        })
      );
      expect(mocks.eventCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('RMM alert'),
          changed_by: 'client-123',
          tenant_id: 'tenant-456',
        })
      );
      expect(mocks.assignNext).toHaveBeenCalledWith(
        TicketCategory.PREVENTATIVE_MAINTENANCE,
        'Tier 2',
        TicketPriority.MEDIUM
      );
      expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-1', 'tech-2');
      expect(result.assigned_tech_id).toBe('tech-2');
    });

    it('assigns from the general pool when assignment mode is general', async () => {
      mocks.ticketCreate.mockResolvedValue(createdTicket());
      mocks.assignNext.mockResolvedValue({ id: 'tech-1', name: 'General Tech' });

      await ticketCreationService.createTicketFromAlert(alertInput, {
        status: TicketStatus.OPEN,
        category: TicketCategory.REPAIR,
        priority: TicketPriority.MEDIUM,
        tag: null,
        assignment: { mode: 'general' },
      });

      expect(mocks.assignNext).toHaveBeenCalledWith(TicketCategory.REPAIR, undefined, TicketPriority.MEDIUM);
      expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-1', 'tech-1');
    });

    it('skips assignment when no assignment request is provided', async () => {
      mocks.ticketCreate.mockResolvedValue(createdTicket());

      const result = await ticketCreationService.createTicketFromAlert(alertInput, {
        status: TicketStatus.OPEN,
        category: TicketCategory.REPAIR,
        priority: TicketPriority.MEDIUM,
        tag: null,
        assignment: null,
      });

      expect(mocks.assignNext).not.toHaveBeenCalled();
      expect(mocks.ticketAssignTech).not.toHaveBeenCalled();
      expect(result.assigned_tech_id).toBeNull();
    });

    it('uses the created-by user as the audit actor when provided', async () => {
      mocks.ticketCreate.mockResolvedValue(createdTicket());

      await ticketCreationService.createTicketFromAlert(
        { ...alertInput, createdByUserId: 'system-1' },
        { status: TicketStatus.OPEN, category: TicketCategory.REPAIR, priority: TicketPriority.LOW, tag: null }
      );

      expect(mocks.eventCreate).toHaveBeenCalledWith(expect.objectContaining({ changed_by: 'system-1' }));
    });
  });

  it('exposes a singleton instance', () => {
    expect(ticketCreationService).toBeInstanceOf(TicketCreationService);
  });
});
