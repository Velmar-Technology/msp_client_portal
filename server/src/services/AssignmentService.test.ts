import { vi, describe, it, expect, beforeEach } from 'vitest';
import { User, TicketCategory, UserRole } from '../types';

const mocks = vi.hoisted(() => {
  return {
    findTechniciansBySpecialty: vi.fn(),
    findActiveTechnicians: vi.fn(),
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

vi.mock('../repositories/UserRepository', () => {
  return {
    userRepository: {
      findTechniciansBySpecialty: mocks.findTechniciansBySpecialty,
      findActiveTechnicians: mocks.findActiveTechnicians,
    },
  };
});

vi.mock('../db', () => {
  return {
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

vi.mock('../utils/logger', () => ({
  logger: {
    warn: mocks.loggerWarn,
    info: mocks.loggerInfo,
    error: vi.fn(),
  },
}));

import { AssignmentService, assignmentService } from './AssignmentService';

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
  });

  describe('getNextTechnician', () => {
    it('returns null when no active technicians exist', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([]);

      const result = await assignmentService.getNextTechnician(TicketCategory.REPAIR);

      expect(result).toBeNull();
      expect(mocks.findActiveTechnicians).toHaveBeenCalledTimes(1);
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No active technicians available for assignment');
    });

    it('returns null when requested specialty is not found and no general active technicians exist', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([]);
      mocks.findActiveTechnicians.mockResolvedValue([]);

      const result = await assignmentService.getNextTechnician(TicketCategory.REPAIR, 'Quantum');

      expect(result).toBeNull();
      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Quantum');
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No specialist found, falling back to general pool', { specialty: 'Quantum' });
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No active technicians available for assignment');
    });

    it('assigns the first technician when no previous round-robin assignment exists for the category', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech2]);
      mocks.dbWhere.mockResolvedValue([]);

      const result = await assignmentService.getNextTechnician(TicketCategory.REPAIR);

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

      const result = await assignmentService.getNextTechnician(TicketCategory.REPAIR);

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

      const result = await assignmentService.getNextTechnician(TicketCategory.REPAIR);

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

      const result = await assignmentService.getNextTechnician(TicketCategory.REPAIR);

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

      const result = await assignmentService.getNextTechnician(TicketCategory.WARRANTY, 'Hardware');

      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Hardware');
      expect(mocks.findActiveTechnicians).not.toHaveBeenCalled();
      expect(result).toEqual(mockTech2);
    });

    it('falls back to general active pool when requested specialty returns no technicians', async () => {
      mocks.findTechniciansBySpecialty.mockResolvedValue([]);
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1, mockTech3]);
      mocks.dbWhere.mockResolvedValue([]);

      const result = await assignmentService.getNextTechnician(TicketCategory.WARRANTY, 'Cybersecurity');

      expect(mocks.findTechniciansBySpecialty).toHaveBeenCalledWith('Cybersecurity');
      expect(mocks.loggerWarn).toHaveBeenCalledWith('No specialist found, falling back to general pool', { specialty: 'Cybersecurity' });
      expect(mocks.findActiveTechnicians).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTech1);
    });

    it('updates round-robin state using onConflictDoUpdate', async () => {
      mocks.findActiveTechnicians.mockResolvedValue([mockTech1]);
      mocks.dbWhere.mockResolvedValue([]);

      await assignmentService.getNextTechnician(TicketCategory.SERVICE_OUTAGE);

      expect(mocks.dbOnConflictDoUpdate).toHaveBeenCalledWith({
        target: 'category',
        set: {
          last_assigned_tech_id: mockTech1.id,
          updated_at: expect.any(Date),
        },
      });
    });

    it('can be instantiated as a new AssignmentService instance', () => {
      const customInstance = new AssignmentService();
      expect(customInstance).toBeInstanceOf(AssignmentService);
    });
  });
});
