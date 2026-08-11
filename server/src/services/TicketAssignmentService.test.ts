import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    ticketFindById: vi.fn(),
    ticketAssignTech: vi.fn(),
    eventCreate: vi.fn(),
    userFindById: vi.fn(),
    onTicketAssigned: vi.fn(),
  };
});

vi.mock('../repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findById: mocks.ticketFindById,
      assignTechnician: mocks.ticketAssignTech,
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
      onTicketAssigned: mocks.onTicketAssigned,
    },
  };
});

import { ticketAssignmentService, TicketAssignmentService } from './TicketAssignmentService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, UserRole } from '../types';

describe('TicketAssignmentService', () => {
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

  const technician = {
    id: 'tech-9',
    name: 'Alice',
    email: 'alice@velmar.test',
    role: UserRole.TECHNICIAN,
    tenant_id: 'tenant-456',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('assigns a technician, logs the event, and notifies them', async () => {
    mocks.ticketFindById.mockResolvedValueOnce(buildTicket());
    mocks.ticketFindById.mockResolvedValueOnce(buildTicket({ assigned_tech_id: 'tech-9' }));
    mocks.userFindById.mockResolvedValue(technician);
    mocks.ticketAssignTech.mockResolvedValue(buildTicket({ assigned_tech_id: 'tech-9' }));

    const result = await ticketAssignmentService.assignTicket('ticket-1', 'tech-9', 'admin-1');

    expect(mocks.ticketAssignTech).toHaveBeenCalledWith('ticket-1', 'tech-9');
    expect(mocks.eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ticket_id: 'ticket-1',
        notes: expect.stringContaining('Alice'),
        changed_by: 'admin-1',
      })
    );
    expect(mocks.onTicketAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ assigned_tech_id: 'tech-9' }),
      technician
    );
    expect(result.assigned_tech_id).toBe('tech-9');
  });

  it('throws a not-found error when the ticket is missing', async () => {
    mocks.ticketFindById.mockResolvedValue(null);

    await expect(ticketAssignmentService.assignTicket('missing', 'tech-9', 'admin-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('throws a not-found error when the technician is missing', async () => {
    mocks.ticketFindById.mockResolvedValue(buildTicket());
    mocks.userFindById.mockResolvedValue(null);

    await expect(ticketAssignmentService.assignTicket('ticket-1', 'tech-9', 'admin-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('rejects assignment to a non-technician', async () => {
    mocks.ticketFindById.mockResolvedValue(buildTicket());
    mocks.userFindById.mockResolvedValue({ ...technician, role: UserRole.CLIENT });

    await expect(ticketAssignmentService.assignTicket('ticket-1', 'tech-9', 'admin-1')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(mocks.ticketAssignTech).not.toHaveBeenCalled();
  });

  it('exposes a singleton instance', () => {
    expect(ticketAssignmentService).toBeInstanceOf(TicketAssignmentService);
  });
});
