import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    ticketUpdate: vi.fn(),
    ticketAddAttachment: vi.fn(),
    ticketGetAttachmentsByResponses: vi.fn(),
    responseCreate: vi.fn(),
    responseFindByTicket: vi.fn(),
    userFindById: vi.fn(),
    onTicketResponseCreated: vi.fn(),
    agentGatewayPushTicketChatMessage: vi.fn(),
    streamGwBroadcastToTicket: vi.fn(),
  };
});

vi.mock('@modules/tickets/repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      update: mocks.ticketUpdate,
      addAttachment: mocks.ticketAddAttachment,
      getAttachmentsByResponses: mocks.ticketGetAttachmentsByResponses,
    },
  };
});

vi.mock('@modules/tickets/repositories/TicketResponseRepository', () => {
  return {
    ticketResponseRepository: {
      create: mocks.responseCreate,
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

vi.mock('@modules/notifications/services/NotificationService', () => {
  return {
    notificationService: {
      onTicketResponseCreated: mocks.onTicketResponseCreated,
    },
  };
});

vi.mock('@modules/rmm', () => {
  return {
    agentGateway: {
      pushTicketChatMessage: mocks.agentGatewayPushTicketChatMessage,
    },
  };
});

vi.mock('./TicketStreamGateway', () => {
  return {
    ticketStreamGateway: {
      broadcastToTicket: mocks.streamGwBroadcastToTicket,
    },
  };
});

import { ticketResponseService, TicketResponseService } from './TicketResponseService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, UserContext, UserRole, AgentPayload } from '@shared/types';

describe('TicketResponseService', () => {
  const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'ticket-1',
    title: 'Server is down',
    description: 'Main server stopped responding',
    category: TicketCategory.REPAIR,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    client_id: 'client-123',
    assigned_tech_id: 'tech-1',
    equipment_id: null,
    tenant_id: 'tenant-456',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const clientCtx: UserContext = { userId: 'client-123', role: UserRole.CLIENT, tenantId: 'tenant-456' };
  const technicianCtx: UserContext = { userId: 'tech-1', role: UserRole.TECHNICIAN, tenantId: 'tenant-456' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTicketResponses', () => {
    it('returns responses enriched with their grouped attachments', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.responseFindByTicket.mockResolvedValue([
        { id: 'resp-1', ticket_id: 'ticket-1', user_id: 'tech-1', message: 'On it' },
        { id: 'resp-2', ticket_id: 'ticket-1', user_id: 'client-123', message: 'Thanks' },
      ]);
      mocks.ticketGetAttachmentsByResponses.mockResolvedValue([
        { id: 'att-1', ticket_id: 'ticket-1', response_id: 'resp-1', filename: 'a.png' },
      ]);

      const responses = await ticketResponseService.getTicketResponses('ticket-1', clientCtx);

      expect(mocks.responseFindByTicket).toHaveBeenCalledWith('ticket-1', false);
      expect(responses[0].attachments).toEqual([
        { id: 'att-1', ticket_id: 'ticket-1', response_id: 'resp-1', filename: 'a.png' },
      ]);
      expect(responses[1].attachments).toEqual([]);
    });

    it('passes includeInternal=true when called by TECHNICIAN', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.responseFindByTicket.mockResolvedValue([]);
      mocks.ticketGetAttachmentsByResponses.mockResolvedValue([]);

      await ticketResponseService.getTicketResponses('ticket-1', technicianCtx);

      expect(mocks.responseFindByTicket).toHaveBeenCalledWith('ticket-1', true);
    });

    it('rejects a client accessing a ticket from another tenant', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ tenant_id: 'tenant-other' }));

      await expect(ticketResponseService.getTicketResponses('ticket-1', clientCtx)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('addTicketResponse', () => {
    const files = [{ filename: 'photo.png', path: '/tmp/photo.png', mimetype: 'image/png', size: 1024 }];

    it('creates a response with attachments and notifies the assigned technician when a client replies', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.responseCreate.mockResolvedValue({ id: 'resp-1', ticket_id: 'ticket-1', user_id: 'client-123' });
      mocks.ticketAddAttachment.mockResolvedValue({
        id: 'att-1',
        ticket_id: 'ticket-1',
        response_id: 'resp-1',
        filename: 'photo.png',
      });
      mocks.userFindById.mockResolvedValue({ id: 'client-123', name: 'Client User' });
      mocks.userFindById.mockResolvedValueOnce({ id: 'client-123', name: 'Client User' });
      mocks.userFindById.mockResolvedValueOnce({ id: 'tech-1', name: 'Alice' });

      const result = await ticketResponseService.addTicketResponse('ticket-1', 'Please fix', clientCtx, files);

      expect(mocks.responseCreate).toHaveBeenCalledWith({
        ticket_id: 'ticket-1',
        user_id: 'client-123',
        message: 'Please fix',
        tenant_id: 'tenant-456',
        is_internal: false,
      });
      expect(mocks.ticketAddAttachment).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-1',
          response_id: 'resp-1',
          filename: 'photo.png',
          tenant_id: 'tenant-456',
        })
      );
      expect(mocks.onTicketResponseCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-1' }),
        expect.objectContaining({ id: 'tech-1' }),
        'Client User',
        'Please fix'
      );
      expect(result.attachments).toEqual([{ id: 'att-1', ticket_id: 'ticket-1', response_id: 'resp-1', filename: 'photo.png' }]);
    });

    it('notifies the client when a technician replies', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.responseCreate.mockResolvedValue({ id: 'resp-1', ticket_id: 'ticket-1', user_id: 'tech-1' });
      mocks.userFindById.mockResolvedValueOnce({ id: 'tech-1', name: 'Alice' });
      mocks.userFindById.mockResolvedValueOnce({ id: 'client-123', name: 'Client User' });

      await ticketResponseService.addTicketResponse('ticket-1', 'Fixed', technicianCtx);

      expect(mocks.onTicketResponseCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-1' }),
        expect.objectContaining({ id: 'client-123' }),
        'Alice',
        'Fixed'
      );
      expect(mocks.agentGatewayPushTicketChatMessage).not.toHaveBeenCalled();
    });

    it('pushes message via agentGateway when ticket is bound to an equipment slot', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ equipment_id: 'eq-slot-42' }));
      mocks.responseCreate.mockResolvedValue({ id: 'resp-1', ticket_id: 'ticket-1', user_id: 'tech-1', created_at: new Date() });
      mocks.userFindById.mockResolvedValue({ id: 'tech-1', name: 'Alice Tech', role: UserRole.TECHNICIAN });

      await ticketResponseService.addTicketResponse('ticket-1', 'We are looking into this', technicianCtx);

      expect(mocks.agentGatewayPushTicketChatMessage).toHaveBeenCalledWith('eq-slot-42', expect.objectContaining({
        ticketId: 'ticket-1',
        responseId: 'resp-1',
        authorName: 'Alice Tech',
        authorRole: UserRole.TECHNICIAN,
        message: 'We are looking into this',
      }));
    });

    it('creates an internal note for technicians that suppresses client email and agent tray push', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ equipment_id: 'eq-slot-42' }));
      mocks.responseCreate.mockResolvedValue({ id: 'resp-int-1', ticket_id: 'ticket-1', user_id: 'tech-1' });
      mocks.userFindById.mockResolvedValue({ id: 'tech-1', name: 'Alice Tech', role: UserRole.TECHNICIAN });

      const res = await ticketResponseService.addTicketResponse(
        'ticket-1',
        'Staff only observation',
        technicianCtx,
        [],
        true // isInternal = true
      );

      expect(mocks.responseCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-1',
          user_id: 'tech-1',
          message: 'Staff only observation',
          is_internal: true,
        })
      );
      expect(mocks.onTicketResponseCreated).not.toHaveBeenCalled();
      expect(mocks.agentGatewayPushTicketChatMessage).not.toHaveBeenCalled();
      expect(mocks.streamGwBroadcastToTicket).toHaveBeenCalledWith(
        'ticket-1',
        expect.objectContaining({
          isInternal: true,
          message: 'Staff only observation',
        })
      );
      expect(res.is_internal).toBe(true);
    });

    it('forces is_internal to false if a client user tries to post an internal note', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.responseCreate.mockResolvedValue({ id: 'resp-cl-1', ticket_id: 'ticket-1', user_id: 'client-123' });
      mocks.userFindById.mockResolvedValue({ id: 'client-123', name: 'Client User' });

      await ticketResponseService.addTicketResponse(
        'ticket-1',
        'Attempted secret note',
        clientCtx,
        [],
        true // client tries to set isInternal
      );

      expect(mocks.responseCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-1',
          is_internal: false,
        })
      );
    });
  });

  describe('addTicketResponseFromAgent', () => {
    const agentCtx: AgentPayload = {
      equipmentId: 'eq-agent-1',
      tenantId: 'tenant-456',
      clientId: 'client-123',
      hostname: 'DESKTOP-TEST',
    };

    it('creates a response authored by endpoint user and notifies technician', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'eq-agent-1',
        tenant_id: 'tenant-456',
        assigned_tech_id: 'tech-1',
      }));
      mocks.responseCreate.mockResolvedValue({
        id: 'resp-agent-1',
        ticket_id: 'ticket-1',
        user_id: 'client-123',
        author_name: 'John Doe',
        message: 'Problem still persists',
        tenant_id: 'tenant-456',
      });
      mocks.userFindById.mockResolvedValue({ id: 'tech-1', name: 'Tech Alice' });

      const res = await ticketResponseService.addTicketResponseFromAgent(
        'ticket-1',
        { message: 'Problem still persists', reporterName: 'John Doe' },
        agentCtx
      );

      expect(mocks.responseCreate).toHaveBeenCalledWith(expect.objectContaining({
        ticket_id: 'ticket-1',
        user_id: 'client-123',
        author_name: 'John Doe',
        message: 'Problem still persists',
        tenant_id: 'tenant-456',
      }));
      expect(mocks.ticketUpdate).toHaveBeenCalledWith('ticket-1', { updated_at: expect.any(Date) });
      expect(mocks.onTicketResponseCreated).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ticket-1' }),
        expect.objectContaining({ id: 'tech-1' }),
        'John Doe (Endpoint)',
        'Problem still persists'
      );
      expect(res.id).toBe('resp-agent-1');
    });

    it('throws NotFoundError when ticket does not exist', async () => {
      mocks.ticketFindById.mockResolvedValue(null);

      await expect(ticketResponseService.addTicketResponseFromAgent(
        'non-existent',
        { message: 'Hi', reporterName: 'John' },
        agentCtx
      )).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws ForbiddenError when ticket equipment does not match agent', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'different-eq',
        tenant_id: 'tenant-456',
      }));

      await expect(ticketResponseService.addTicketResponseFromAgent(
        'ticket-1',
        { message: 'Hi', reporterName: 'John' },
        agentCtx
      )).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws ForbiddenError when ticket tenant does not match agent', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'eq-agent-1',
        tenant_id: 'different-tenant',
      }));

      await expect(ticketResponseService.addTicketResponseFromAgent(
        'ticket-1',
        { message: 'Hi', reporterName: 'John' },
        agentCtx
      )).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws ValidationError when ticket is CLOSED', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'eq-agent-1',
        tenant_id: 'tenant-456',
        status: TicketStatus.CLOSED,
      }));

      await expect(ticketResponseService.addTicketResponseFromAgent(
        'ticket-1',
        { message: 'Hi', reporterName: 'John' },
        agentCtx
      )).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws ValidationError when ticket is CANCELLED', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'eq-agent-1',
        tenant_id: 'tenant-456',
        status: TicketStatus.CANCELLED,
      }));

      await expect(ticketResponseService.addTicketResponseFromAgent(
        'ticket-1',
        { message: 'Hi', reporterName: 'John' },
        agentCtx
      )).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('getTicketResponsesForAgent', () => {
    const agentCtx = {
      equipmentId: 'eq-agent-1',
      tenantId: 'tenant-456',
      clientId: 'client-123',
      hostname: 'WORKSTATION-01',
    };

    it('returns filtered non-internal responses for authorized agent', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'eq-agent-1',
        tenant_id: 'tenant-456',
      }));
      mocks.responseFindByTicket.mockResolvedValue([
        { id: 'resp-1', message: 'Client public message', is_internal: false },
        { id: 'resp-2', message: 'Internal tech note', is_internal: true },
        { id: 'resp-3', message: 'Technician public update', is_internal: false },
      ]);
      mocks.ticketGetAttachmentsByResponses.mockResolvedValue([]);

      const result = await ticketResponseService.getTicketResponsesForAgent('ticket-1', agentCtx);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(['resp-1', 'resp-3']);
    });

    it('throws 404 when ticket does not exist', async () => {
      mocks.ticketFindById.mockResolvedValue(null);

      await expect(
        ticketResponseService.getTicketResponsesForAgent('missing-ticket', agentCtx)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when ticket belongs to another equipment slot', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({
        equipment_id: 'other-equipment',
        tenant_id: 'tenant-456',
      }));

      await expect(
        ticketResponseService.getTicketResponsesForAgent('ticket-1', agentCtx)
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  it('exposes a singleton instance', () => {
    expect(ticketResponseService).toBeInstanceOf(TicketResponseService);
  });
});
