import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    ticketAddAttachment: vi.fn(),
    ticketGetAttachmentsByResponses: vi.fn(),
    responseCreate: vi.fn(),
    responseFindByTicket: vi.fn(),
    userFindById: vi.fn(),
    onTicketResponseCreated: vi.fn(),
  };
});

vi.mock('../repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      addAttachment: mocks.ticketAddAttachment,
      getAttachmentsByResponses: mocks.ticketGetAttachmentsByResponses,
    },
  };
});

vi.mock('../repositories/TicketResponseRepository', () => {
  return {
    ticketResponseRepository: {
      create: mocks.responseCreate,
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

vi.mock('./NotificationService', () => {
  return {
    notificationService: {
      onTicketResponseCreated: mocks.onTicketResponseCreated,
    },
  };
});

import { ticketResponseService, TicketResponseService } from './TicketResponseService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, UserContext, UserRole } from '../types';

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

      expect(responses[0].attachments).toEqual([
        { id: 'att-1', ticket_id: 'ticket-1', response_id: 'resp-1', filename: 'a.png' },
      ]);
      expect(responses[1].attachments).toEqual([]);
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
    });
  });

  it('exposes a singleton instance', () => {
    expect(ticketResponseService).toBeInstanceOf(TicketResponseService);
  });
});
