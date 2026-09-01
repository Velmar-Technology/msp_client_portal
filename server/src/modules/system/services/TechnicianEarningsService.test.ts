import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TechnicianEarningsService } from './TechnicianEarningsService';
import { Ticket, TicketCategory, TicketPriority, TicketStatus, EarningStatus, UserRole } from '@shared/types';
import { ForbiddenError, ValidationError } from '@shared/errors';

describe('TechnicianEarningsService', () => {
  let mockEarningsRepo: any;
  let mockExpenseRepo: any;
  let mockUserRepo: any;
  let mockTicketRepo: any;
  let service: TechnicianEarningsService;

  const mockTicket: Ticket = {
    id: 'ticket-123',
    title: 'Server Fan Failure',
    description: 'Hardware issue',
    category: TicketCategory.REPAIR,
    priority: TicketPriority.CRITICAL,
    status: TicketStatus.RESOLVED,
    client_id: 'client-1',
    assigned_tech_id: 'tech-1',
    equipment_id: null,
    tenant_id: 'tenant-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockTechUser = {
    id: 'tech-1',
    name: 'Alex Rivera',
    email: 'alex.tech@msp-services.com',
    role: UserRole.TECHNICIAN,
    tenant_id: 'tenant-1',
  };

  beforeEach(() => {
    mockEarningsRepo = {
      findByTicketId: vi.fn().mockResolvedValue(null),
      getRateForTechnician: vi.fn().mockResolvedValue({
        id: 'rate-1',
        technician_id: null,
        base_closed_rate: 8.0,
        sla_bonus_rate: 4.0,
        currency: 'USD',
        multiplier_critical: 2.5,
        multiplier_high: 1.75,
        multiplier_medium: 1.25,
        multiplier_low: 1.0,
        tenant_id: 'tenant-1',
      }),
      createEarning: vi.fn().mockImplementation((data) => ({
        id: 'earning-1',
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })),
      updateStatus: vi.fn().mockImplementation((id, status) => ({
        id,
        status,
      })),
      getSummaryByTechnician: vi.fn().mockResolvedValue({
        technician_id: 'tech-1',
        total_closed_tickets: 5,
        total_earned: 100,
        pending_amount: 100,
        approved_amount: 0,
        paid_amount: 0,
        sla_met_count: 4,
        sla_met_rate: 80,
      }),
      findByTechnician: vi.fn().mockResolvedValue([]),
      getAllTechniciansSummary: vi.fn().mockResolvedValue([]),
      findAll: vi.fn().mockResolvedValue([]),
      batchUpdateStatus: vi.fn().mockResolvedValue(3),
      upsertRate: vi.fn().mockImplementation((data) => ({ id: 'rate-1', ...data })),
    };

    mockExpenseRepo = {
      create: vi.fn().mockResolvedValue({
        id: 'expense-1',
        amount: 24.0,
        description: 'Commission for closed ticket: "Server Fan Failure"',
        category: 'Labor & Technician Commissions',
        expense_date: new Date(),
        tenant_id: 'tenant-1',
      }),
      update: vi.fn().mockResolvedValue({ id: 'expense-1' }),
    };

    mockEarningsRepo.updateEarning = vi.fn().mockResolvedValue({ id: 'earning-1' });

    mockUserRepo = {
      findById: vi.fn().mockResolvedValue(mockTechUser),
    };

    mockTicketRepo = {
      findClosedTicketsForTenant: vi.fn().mockResolvedValue([mockTicket]),
    };

    service = new TechnicianEarningsService(mockEarningsRepo, mockExpenseRepo, mockUserRepo, mockTicketRepo);
  });

  describe('calculateAndRecordEarnings', () => {
    it('should skip automated resolutions (RESOLVED_AUTOMATED)', async () => {
      const autoTicket = { ...mockTicket, status: TicketStatus.RESOLVED_AUTOMATED };
      const result = await service.calculateAndRecordEarnings(autoTicket, 'tech-1', 'tenant-1');
      expect(result).toBeNull();
      expect(mockEarningsRepo.createEarning).not.toHaveBeenCalled();
      expect(mockExpenseRepo.create).not.toHaveBeenCalled();
    });

    it('should skip if no technician is assigned', async () => {
      const result = await service.calculateAndRecordEarnings(mockTicket, '', 'tenant-1');
      expect(result).toBeNull();
      expect(mockEarningsRepo.createEarning).not.toHaveBeenCalled();
    });

    it('should return existing earning if already recorded (idempotency)', async () => {
      const existingEarning = { id: 'earning-existing', ticket_id: 'ticket-123' };
      mockEarningsRepo.findByTicketId.mockResolvedValueOnce(existingEarning);

      const result = await service.calculateAndRecordEarnings(mockTicket, 'tech-1', 'tenant-1');
      expect(result).toEqual(existingEarning);
      expect(mockEarningsRepo.createEarning).not.toHaveBeenCalled();
    });

    it('should calculate CRITICAL priority commission with 2.5x multiplier and SLA bonus', async () => {
      const result = await service.calculateAndRecordEarnings(mockTicket, 'tech-1', 'tenant-1');

      expect(result).not.toBeNull();
      // Base rate $8 * 2.5 = $20.00 base, SLA bonus = $4.00, Total = $24.00
      expect(result?.base_amount).toBe(20.0);
      expect(result?.sla_bonus_amount).toBe(4.0);
      expect(result?.final_amount).toBe(24.0);
      expect(result?.status).toBe(EarningStatus.PENDING);
      expect(result?.breakdown.priorityMultiplier).toBe(2.5);
      expect(result?.breakdown.slaMet).toBe(true);

      // Verify OpEx auto-posting in expenses table
      expect(mockExpenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 24.0,
          category: 'Labor & Technician Commissions',
          tenant_id: 'tenant-1',
        })
      );
    });

    it('should calculate LOW priority commission with 1.0x multiplier', async () => {
      const lowTicket: Ticket = { ...mockTicket, priority: TicketPriority.LOW };
      const result = await service.calculateAndRecordEarnings(lowTicket, 'tech-1', 'tenant-1');

      expect(result).not.toBeNull();
      // Base rate $8 * 1.0 = $8.00 base, SLA bonus = $4.00, Total = $12.00
      expect(result?.base_amount).toBe(8.0);
      expect(result?.final_amount).toBe(12.0);
      expect(result?.breakdown.priorityMultiplier).toBe(1.0);
    });
  });

  describe('voidEarningsForReopenedTicket', () => {
    it('should void a pending earning when ticket is reopened', async () => {
      mockEarningsRepo.findByTicketId.mockResolvedValueOnce({
        id: 'earning-1',
        ticket_id: 'ticket-123',
        status: EarningStatus.PENDING,
        technician_id: 'tech-1',
      });

      const result = await service.voidEarningsForReopenedTicket('ticket-123', 'tenant-1');
      expect(result).not.toBeNull();
      expect(mockEarningsRepo.updateStatus).toHaveBeenCalledWith('earning-1', EarningStatus.VOIDED);
    });

    it('should do nothing if earning does not exist or is already voided/paid', async () => {
      mockEarningsRepo.findByTicketId.mockResolvedValueOnce({
        id: 'earning-1',
        status: EarningStatus.PAID,
      });

      const result = await service.voidEarningsForReopenedTicket('ticket-123', 'tenant-1');
      expect(result).toBeNull();
      expect(mockEarningsRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('processBatchPayout', () => {
    it('should process batch payout when user is ADMIN', async () => {
      const adminCtx = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      const result = await service.processBatchPayout(['earning-1', 'earning-2'], adminCtx);

      expect(result.processed).toBe(3);
      expect(mockEarningsRepo.batchUpdateStatus).toHaveBeenCalledWith(
        ['earning-1', 'earning-2'],
        EarningStatus.PAID,
        expect.any(Date)
      );
    });

    it('should throw ForbiddenError when non-admin attempts batch payout', async () => {
      const techCtx = { userId: 'tech-1', role: UserRole.TECHNICIAN, tenantId: 'tenant-1' };
      await expect(service.processBatchPayout(['earning-1'], techCtx)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError when empty earningIds provided', async () => {
      const adminCtx = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      await expect(service.processBatchPayout([], adminCtx)).rejects.toThrow(ValidationError);
    });
  });

  describe('updateRates', () => {
    it('should update rates for ADMIN', async () => {
      const adminCtx = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      const result = await service.updateRates(
        {
          base_closed_rate: 10.0,
          sla_bonus_rate: 5.0,
        },
        adminCtx
      );

      expect(result).toBeDefined();
      expect(mockEarningsRepo.upsertRate).toHaveBeenCalled();
    });

    it('should reject negative rates with ValidationError', async () => {
      const adminCtx = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      await expect(
        service.updateRates(
          {
            base_closed_rate: -5.0,
            sla_bonus_rate: 2.0,
          },
          adminCtx
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('recalculateTenantCommissions', () => {
    it('should recalculate and create new earnings for closed tickets without earnings', async () => {
      const adminCtx = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      mockEarningsRepo.findByTicketId.mockResolvedValueOnce(null);

      const result = await service.recalculateTenantCommissions('tenant-1', adminCtx);

      expect(result.processedTickets).toBe(1);
      expect(result.createdEarnings).toBe(1);
      expect(result.updatedEarnings).toBe(0);
      expect(mockEarningsRepo.createEarning).toHaveBeenCalled();
      expect(mockExpenseRepo.create).toHaveBeenCalled();
    });

    it('should recalculate and update existing pending earnings', async () => {
      const adminCtx = { userId: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      mockEarningsRepo.findByTicketId.mockResolvedValueOnce({
        id: 'earning-existing',
        ticket_id: 'ticket-123',
        status: EarningStatus.PENDING,
        expense_id: 'expense-1',
      });

      const result = await service.recalculateTenantCommissions('tenant-1', adminCtx);

      expect(result.processedTickets).toBe(1);
      expect(result.createdEarnings).toBe(0);
      expect(result.updatedEarnings).toBe(1);
      expect(mockEarningsRepo.updateEarning).toHaveBeenCalledWith('earning-existing', expect.any(Object));
      expect(mockExpenseRepo.update).toHaveBeenCalledWith('expense-1', expect.any(Object));
    });

    it('should throw ForbiddenError when non-admin attempts recalculation', async () => {
      const techCtx = { userId: 'tech-1', role: UserRole.TECHNICIAN, tenantId: 'tenant-1' };
      await expect(service.recalculateTenantCommissions('tenant-1', techCtx)).rejects.toThrow(ForbiddenError);
    });
  });
});
