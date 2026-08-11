import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    ticketGetAttachments: vi.fn(),
    ticketAddAttachment: vi.fn(),
  };
});

vi.mock('../repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      getAttachments: mocks.ticketGetAttachments,
      addAttachment: mocks.ticketAddAttachment,
    },
  };
});

import { ticketAttachmentService, TicketAttachmentService } from './TicketAttachmentService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, UploadedFile, UserContext, UserRole } from '../types';

describe('TicketAttachmentService', () => {
  const buildTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'ticket-1',
    title: 'Server is down',
    description: 'Main server stopped responding',
    category: TicketCategory.REPAIR,
    status: TicketStatus.OPEN,
    priority: TicketPriority.MEDIUM,
    client_id: 'client-123',
    assigned_tech_id: null,
    equipment_id: null,
    tenant_id: 'tenant-456',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  });

  const clientCtx: UserContext = { userId: 'client-123', role: UserRole.CLIENT, tenantId: 'tenant-456' };
  const file: UploadedFile = { filename: 'evidence.pdf', path: '/tmp/evidence.pdf', mimetype: 'application/pdf', size: 2048 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTicketAttachments', () => {
    it('returns the top-level attachments for an accessible ticket', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.ticketGetAttachments.mockResolvedValue([{ id: 'att-1', ticket_id: 'ticket-1', filename: 'evidence.pdf' }]);

      const attachments = await ticketAttachmentService.getTicketAttachments('ticket-1', clientCtx);

      expect(mocks.ticketGetAttachments).toHaveBeenCalledWith('ticket-1');
      expect(attachments).toEqual([{ id: 'att-1', ticket_id: 'ticket-1', filename: 'evidence.pdf' }]);
    });

    it('rejects a client accessing a ticket from another tenant', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ tenant_id: 'tenant-other' }));

      await expect(ticketAttachmentService.getTicketAttachments('ticket-1', clientCtx)).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  describe('addAttachment', () => {
    it('persists the file against the ticket with the ticket tenant', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket());
      mocks.ticketAddAttachment.mockResolvedValue({
        id: 'att-1',
        ticket_id: 'ticket-1',
        filename: 'evidence.pdf',
      });

      const attachment = await ticketAttachmentService.addAttachment('ticket-1', file, clientCtx);

      expect(mocks.ticketAddAttachment).toHaveBeenCalledWith({
        ticket_id: 'ticket-1',
        filename: 'evidence.pdf',
        path: '/tmp/evidence.pdf',
        mime_type: 'application/pdf',
        size_bytes: 2048,
        tenant_id: 'tenant-456',
      });
      expect(attachment.id).toBe('att-1');
    });

    it('rejects a cross-tenant client before persisting', async () => {
      mocks.ticketFindById.mockResolvedValue(buildTicket({ tenant_id: 'tenant-other' }));

      await expect(ticketAttachmentService.addAttachment('ticket-1', file, clientCtx)).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mocks.ticketAddAttachment).not.toHaveBeenCalled();
    });
  });

  it('exposes a singleton instance', () => {
    expect(ticketAttachmentService).toBeInstanceOf(TicketAttachmentService);
  });
});
