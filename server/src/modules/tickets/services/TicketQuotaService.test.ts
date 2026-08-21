import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TicketQuotaService, ticketQuotaService } from './TicketQuotaService';
import { SubscriptionStatus } from '@shared/types';
import { TicketLimitExceededError, ForbiddenError } from '@shared/errors';
import { HELPDESK_SUPPORT_FEATURE_CODE } from '@shared/config/constants';

describe('TicketQuotaService', () => {
  const mockSubRepo = {
    findByClient: vi.fn(),
  };

  const mockPlanRepo = {
    findById: vi.fn(),
  };

  const mockTicketRepo = {
    countClientTicketsInCurrentMonth: vi.fn(),
    countEquipmentTicketsInCurrentMonth: vi.fn(),
  };

  let service: TicketQuotaService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TicketQuotaService(
      mockSubRepo as any,
      mockPlanRepo as any,
      mockTicketRepo as any
    );
  });

  it('exposes a singleton instance', () => {
    expect(ticketQuotaService).toBeInstanceOf(TicketQuotaService);
  });

  it('throws ForbiddenError when client has no active or expiring subscriptions', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.CANCELLED, plan: 'plan-basic' },
      { id: 'sub-2', status: SubscriptionStatus.EXPIRED, plan: 'plan-basic' },
    ]);

    await expect(service.enforceTicketLimit('client-1', 'tenant-1')).rejects.toThrow(ForbiddenError);
    expect(mockPlanRepo.findById).not.toHaveBeenCalled();
    expect(mockTicketRepo.countClientTicketsInCurrentMonth).not.toHaveBeenCalled();
  });

  it('allows ticket creation when plan features do not restrict helpdesk support or are unlimited', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.ACTIVE, plan: 'plan-pro' },
    ]);

    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-pro',
      features: [
        { code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: 'Unlimited' } },
      ],
    });

    await expect(service.enforceTicketLimit('client-1', 'tenant-1')).resolves.toBeUndefined();
    expect(mockTicketRepo.countClientTicketsInCurrentMonth).not.toHaveBeenCalled();
  });

  it('allows ticket creation when account ticket count is below monthly limit', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.ACTIVE, plan: 'plan-starter' },
    ]);

    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-starter',
      features: [
        { code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: '10' } },
      ],
    });

    mockTicketRepo.countClientTicketsInCurrentMonth.mockResolvedValue(5);

    await expect(service.enforceTicketLimit('client-1', 'tenant-1')).resolves.toBeUndefined();
    expect(mockTicketRepo.countClientTicketsInCurrentMonth).toHaveBeenCalledWith('client-1');
  });

  it('throws TicketLimitExceededError when account ticket count reaches or exceeds limit', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.ACTIVE, plan: 'plan-starter' },
    ]);

    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-starter',
      features: [
        { code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: '10' } },
      ],
    });

    mockTicketRepo.countClientTicketsInCurrentMonth.mockResolvedValue(10);

    await expect(service.enforceTicketLimit('client-1', 'tenant-1')).rejects.toThrow(TicketLimitExceededError);
    expect(mockTicketRepo.countClientTicketsInCurrentMonth).toHaveBeenCalledWith('client-1');
  });

  it('enforces device quota when equipmentId is provided', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.ACTIVE, plan: 'plan-starter' },
    ]);

    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-starter',
      features: [
        { code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: 5 } },
      ],
    });

    mockTicketRepo.countEquipmentTicketsInCurrentMonth.mockResolvedValue(5);

    await expect(service.enforceTicketLimit('client-1', 'tenant-1', 'equip-123')).rejects.toThrow(TicketLimitExceededError);
    expect(mockTicketRepo.countEquipmentTicketsInCurrentMonth).toHaveBeenCalledWith('equip-123');
    expect(mockTicketRepo.countClientTicketsInCurrentMonth).not.toHaveBeenCalled();
  });

  it('allows ticket creation when device ticket count is below limit', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.EXPIRING, plan: 'plan-starter' },
    ]);

    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-starter',
      features: [
        { code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: 5 } },
      ],
    });

    mockTicketRepo.countEquipmentTicketsInCurrentMonth.mockResolvedValue(2);

    await expect(service.enforceTicketLimit('client-1', 'tenant-1', 'equip-123')).resolves.toBeUndefined();
    expect(mockTicketRepo.countEquipmentTicketsInCurrentMonth).toHaveBeenCalledWith('equip-123');
  });

  it('picks the maximum limit across multiple active subscriptions', async () => {
    mockSubRepo.findByClient.mockResolvedValue([
      { id: 'sub-1', status: SubscriptionStatus.ACTIVE, plan: 'plan-starter' },
      { id: 'sub-2', status: SubscriptionStatus.ACTIVE, plan: 'plan-advanced' },
    ]);

    mockPlanRepo.findById.mockImplementation(async (id: string) => {
      if (id === 'plan-starter') {
        return {
          id: 'plan-starter',
          features: [{ code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: 5 } }],
        };
      }
      if (id === 'plan-advanced') {
        return {
          id: 'plan-advanced',
          features: [{ code: HELPDESK_SUPPORT_FEATURE_CODE, included: true, params: { limit: 20 } }],
        };
      }
      return null;
    });

    mockTicketRepo.countClientTicketsInCurrentMonth.mockResolvedValue(12);

    // 12 is > 5, but <= 20, so it should succeed
    await expect(service.enforceTicketLimit('client-1', 'tenant-1')).resolves.toBeUndefined();
  });
});
