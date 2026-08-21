import { vi, describe, it, expect, beforeEach } from 'vitest';
import { User, Ticket, TicketCategory, TicketPriority, TicketStatus, UserRole } from '@shared/types';

const mocks = vi.hoisted(() => {
  return {
    findTechniciansBySpecialty: vi.fn(),
    findActiveTechnicians: vi.fn(),
    findAllTechnicians: vi.fn(),
    getConnectedUserIds: vi.fn(),
    findOpenTicketsForTechnicians: vi.fn(),
    dbSelect: vi.fn(),
    dbFrom: vi.fn(),
    dbWhere: vi.fn(),
    dbInsert: vi.fn(),
    dbValues: vi.fn(),
    dbOnConflictDoUpdate: vi.fn(),
    loggerWarn: vi.fn(),
    loggerInfo: vi.fn(),
  };
});

vi.mock('@modules/auth', () => {
  return {
    userRepository: {
      findTechniciansBySpecialty: mocks.findTechniciansBySpecialty,
      findActiveTechnicians: mocks.findActiveTechnicians,
      findAllTechnicians: mocks.findAllTechnicians,
    },
    tenantRepository: {
      findById: vi.fn(),
    },
  };
});

vi.mock('@modules/notifications', () => {
  return {
    notificationService: {
      getConnectedUserIds: mocks.getConnectedUserIds,
    },
  };
});

vi.mock('@modules/tickets/repositories/TicketRepository', () => {
  return {
    ticketRepository: {
      findOpenTicketsForTechnicians: mocks.findOpenTicketsForTechnicians,
    },
  };
});

vi.mock('@shared/db', () => {
  return {
    tenants: {},
    users: {},
    tickets: {},
    db: {
      select: mocks.dbSelect,
      insert: mocks.dbInsert,
    },
    roundRobinState: {
      category: 'category',
      last_assigned_tech_id: 'last_assigned_tech_id',
      updated_at: 'updated_at',
    },
  };
});

vi.mock('@shared/utils/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
    info: mocks.loggerInfo,
    error: vi.fn(),
  },
}));

import { AssignmentService, assignmentService } from './AssignmentService';
import { RoundRobinAssignmentStrategy } from './strategies/RoundRobinAssignmentStrategy';
import { CapacityWeightedAssignmentStrategy } from './strategies/CapacityWeightedAssignmentStrategy';

describe('AssignmentService', () => {
  const createMockUser = (id: string, name: string, specialty?: string): User => ({
    id,
    email: `${id}@example.com`,
    name,
    password_hash: 'hashed_pw',
    role: UserRole.TECHNICIAN,
    is_active: true,
    specialty: specialty || null,
    tenant_id: 'tenant-1',
    client_type: 'CLIENT',
    language: 'en_US',
    avatar_url: null,
    phone_number: null,
    email_verified: true,
    otp_code: null,
    otp_expires: null,
    last_login_at: null,
    last_login_ip: null,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const createMockTicket = (techId: string, priority: TicketPriority): Ticket => ({
    id: `ticket-${techId}-${priority}`,
    title: 'Mock ticket',
    description: 'Mock ticket description',
    category: TicketCategory.REPAIR,
    status: TicketStatus.OPEN,
    priority,
    client_id: 'client-1',
    assigned_tech_id: techId,
    equipment_id: null,
    tenant_id: 'tenant-1',
    created_at: new Date(),
    updated_at: new Date(),
  });

  const mockTech1 = createMockUser('tech-1', 'Alice', 'Network');
  const mockTech2 = createMockUser('tech-2', 'Bob', 'Hardware');
  const mockTech3 = createMockUser('tech-3', 'Charlie', 'Software');

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.dbSelect.mockReturnValue({
      from: mocks.dbFrom.mockReturnValue({
        where: mocks.dbWhere,
      }),
    });

    mocks.dbInsert.mockReturnValue({
      values: mocks.dbValues.mockReturnValue({
        onConflictDoUpdate: mocks.dbOnConflictDoUpdate,
      }),
    });

    mocks.findOpenTicketsForTechnicians.mockResolvedValue([]);
    mocks.findAllTechnicians.mockResolvedValue([]);
    mocks.getConnectedUserIds.mockReturnValue([]);
  });

  describe('RoundRobinAssignmentStrategy', () => {
    const roundRobin = () => new RoundRobinAssignmentStrategy();

    it('returns null when no active technicians exist', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([]);

      const result = await roundRobin().assign(TicketCategory.REPAIR);

      expect(result).toBeNull();
      expect(mocks.findActiveTechnicians).toHaveBeenCalledTimes(1);
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No active technicians available for assignment');
    });

    it('returns null when requested specialty is not found and no general active technicians exist', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([]);
      mocks.findActiveTechnicians.mockResolvedValue([]);

      const result = await roundRobin().assign(TicketCategory.REPAIR, 'Quantum');

      expect(result).toBeNull();
      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Quantum');
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No specialist found, falling back to general pool', { specialty: 'Quantum' });
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No active technicians available for assignment');
    });

    it('assigns the first technician when no previous round-robin assignment exists for the category', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech2]);
      mocks.dbWhere.mockResolvedValue([]);

      const result = await roundRobin().assign(TicketCategory.REPAIR);

      expect(result).toEqual(mockTech1);
      expect(mocks.dbInsert).toHaveBeenCalled();
      expect(mocks.dbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          category: TicketCategory.REPAIR,
          last_assigned_tech_id: mockTech1.id,
          updated_at: expect.any(Date),
        })
      );
      expect(mocks.loggerInfo).toHaveBeenCalledWith('Technician assigned via Round-Robin', {
        techId: mockTech1.id,
        techName: mockTech1.name,
        category: TicketCategory.REPAIR,
        specialty: mockTech1.specialty,
      });
    });

    it('rotates to the next technician when a previous assignment exists', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech2, mockTech3]);
      mocks.dbWhere.mockResolvedValue([{ last_assigned_tech_id: mockTech1.id }]);

      const result = await roundRobin().assign(TicketCategory.REPAIR);

      expect(result).toEqual(mockTech2);
      expect(mocks.dbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          category: TicketCategory.REPAIR,
          last_assigned_tech_id: mockTech2.id,
        })
      );
    });

    it('wraps around to the first technician when the last assigned tech was at the end of the list', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech2, mockTech3]);
      mocks.dbWhere.mockResolvedValue([{ last_assigned_tech_id: mockTech3.id }]);

      const result = await roundRobin().assign(TicketCategory.REPAIR);

      expect(result).toEqual(mockTech1);
      expect(mocks.dbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          category: TicketCategory.REPAIR,
          last_assigned_tech_id: mockTech1.id,
        })
      );
    });

    it('falls back to index 0 when the last assigned tech ID is no longer in the active technician list', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech2, mockTech3]);
      mocks.dbWhere.mockResolvedValue([{ last_assigned_tech_id: 'old-deleted-tech-id' }]);

      const result = await roundRobin().assign(TicketCategory.REPAIR);

      expect(result).toEqual(mockTech2);
      expect(mocks.dbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          category: TicketCategory.REPAIR,
          last_assigned_tech_id: mockTech2.id,
        })
      );
    });

    it('filters technicians by requested specialty when available', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([mockTech2]);
      mocks.dbWhere.mockResolvedValue([]);

      const result = await roundRobin().assign(TicketCategory.WARRANTY, 'Hardware');

      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Hardware');
      expect(mocks.findActiveTechnicians).not.toHaveBeenCalled();
      expect(result).toEqual(mockTech2);
    });

    it('falls back to general active pool when requested specialty returns no technicians', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([]);
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech3]);
      mocks.dbWhere.mockResolvedValue([]);

      const result = await roundRobin().assign(TicketCategory.WARRANTY, 'Cybersecurity');

      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Cybersecurity');
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No specialist found, falling back to general pool', { specialty: 'Cybersecurity' });
      expect(mocks.findActiveTechnicians).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTech1);
    });

    it('updates round-robin state using onConflictDoUpdate', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1]);
      mocks.dbWhere.mockResolvedValue([]);

      await roundRobin().assign(TicketCategory.SERVICE_OUTAGE);

      expect(mocks.dbOnConflictDoUpdate).toHaveBeenCalledWith({
        target: 'category',
        set: {
          last_assigned_tech_id: mockTech1.id,
          updated_at: expect.any(Date),
        },
      });
    });
  });

  describe('CapacityWeightedAssignmentStrategy', () => {
    const capacity = () => new AssignmentService(new CapacityWeightedAssignmentStrategy());

    it('routes to the specialist with the minimized weighted open-ticket load', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech2]);
      mocks.findOpenTicketsForTechnicians.mockResolvedValue([
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech2.id, TicketPriority.LOW),
      ]);

      const result = await capacity().assignNext(TicketCategory.REPAIR);

      expect(result).toEqual(mockTech2);
      expect(mocks.findOpenTicketsForTechnicians).toHaveBeenCalledWith([mockTech1.id, mockTech2.id]);
    });

    it('calculates priority weights (P1=4.0, P2=2.0, P3=1.0, P4=0.5) when summing load', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech2]);
      mocks.findOpenTicketsForTechnicians.mockResolvedValue([
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech2.id, TicketPriority.LOW),
      ]);

      const result = await capacity().assignNext(TicketCategory.REPAIR);

      // tech-1 load = 4.0 * 4 = 16.0 (> 15.0), tech-2 load = 0.5
      expect(result).toEqual(mockTech2);
    });

    it('falls back to the general active pool when all specialists exceed the 15.0 capacity threshold', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([mockTech1]);
      mocks.findActiveTechnicians.mockResolvedValue([mockTech2]);
      mocks.findOpenTicketsForTechnicians.mockResolvedValue([
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
        createMockTicket(mockTech1.id, TicketPriority.CRITICAL),
      ]);

      const result = await capacity().assignNext(TicketCategory.REPAIR, 'Network');

      expect(mocks.loggerWarn).toHaveBeenCalledWith(
        'All specialists exceed capacity threshold, falling back to general pool',
        { threshold: 15.0 }
      );
      expect(mocks.findActiveTechnicians).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTech2);
    });

    it('uses the general pool when the requested specialty has no technicians', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([]);
      mocks.findActiveTechnicians.mockResolvedValue([mockTech3]);

      const result = await capacity().assignNext(TicketCategory.WARRANTY, 'Cybersecurity');

      expect(result).toEqual(mockTech3);
      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Cybersecurity');
      expect(mocks.findActiveTechnicians).toHaveBeenCalledTimes(1);
    });

    it('returns null when no technicians are available', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([]);

      const result = await capacity().assignNext(TicketCategory.REPAIR);

      expect(result).toBeNull();
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No active technicians available for assignment');
    });

    it('falls back to an online technician when no active technicians are available', async () => {
      const onlineTech = createMockUser('tech-online', 'Dave');
      mocks.findActiveTechnicians.mockResolvedValue([]);
      mocks.getConnectedUserIds.mockReturnValue([onlineTech.id]);
      mocks.findAllTechnicians.mockResolvedValue([onlineTech]);

      const result = await capacity().assignNext(TicketCategory.REPAIR);

      expect(result).toEqual(onlineTech);
      expect(mocks.findAllTechnicians).toHaveBeenCalledTimes(1);
      expect(mocks.loggerInfo).toHaveBeenCalledWith(
        'Technician assigned via online fallback',
        expect.objectContaining({ techId: onlineTech.id, category: TicketCategory.REPAIR })
      );
    });

    it('returns null when no active technicians exist and nobody is connected', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([]);
      mocks.getConnectedUserIds.mockReturnValue([]);

      const result = await capacity().assignNext(TicketCategory.REPAIR);

      expect(result).toBeNull();
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No active technicians available for assignment');
      expect(mocks.findAllTechnicians).not.toHaveBeenCalled();
    });

    it('returns null when connected users include no technicians', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([]);
      mocks.getConnectedUserIds.mockReturnValue(['client-1']);
      mocks.findAllTechnicians.mockResolvedValue([]);

      const result = await capacity().assignNext(TicketCategory.REPAIR);

      expect(result).toBeNull();
    });

    it('threads the ticket priority through to the strategy', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1]);

      const result = await new AssignmentService().assignNext(TicketCategory.REPAIR, undefined, TicketPriority.CRITICAL);

      expect(result).toEqual(mockTech1);
      expect(mocks.loggerInfo).toHaveBeenCalledWith(
        'Technician assigned via Capacity-Weighted',
        expect.objectContaining({ priority: TicketPriority.CRITICAL })
      );
    });
  });

  it('exposes a singleton assignmentService instance', () => {
    expect(assignmentService).toBeInstanceOf(AssignmentService);
    expect(new AssignmentService()).toBeInstanceOf(AssignmentService);
  });
});

