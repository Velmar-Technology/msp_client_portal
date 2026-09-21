import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserContext, UserRole } from '@shared/types';
import { NavCounterService } from './NavCounterService';
import type { NavCounterRepository } from '../repositories/NavCounterRepository';

describe('NavCounterService — Actionable Unread Calculations', () => {
  let service: NavCounterService;
  let mockRepo: Partial<NavCounterRepository>;

  const clientCtx: UserContext = {
    userId: 'user-client-1',
    role: UserRole.CLIENT,
    tenantId: 'tenant-1',
  };

  const techCtx: UserContext = {
    userId: 'user-tech-1',
    role: UserRole.TECHNICIAN,
    tenantId: 'tenant-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      getSeenAt: vi.fn().mockResolvedValue(new Date(0)),
      upsertSeen: vi.fn().mockResolvedValue(undefined),
      countTickets: vi.fn().mockResolvedValue({ count: 3, latestAt: '2026-09-21T10:00:00.000Z' }),
      countDeviceAlerts: vi.fn().mockResolvedValue({ count: 0, latestAt: null }),
      countMaintenance: vi.fn().mockResolvedValue({ count: 2, latestAt: '2026-09-21T09:00:00.000Z' }),
      countInvoices: vi.fn().mockResolvedValue({ count: 0, latestAt: null }),
      countLeads: vi.fn().mockResolvedValue({ count: 0, latestAt: null }),
      countNotifications: vi.fn().mockResolvedValue({ count: 0, latestAt: null }),
    };
    service = new NavCounterService(mockRepo as NavCounterRepository);
  });

  it('queries counts for client role with appropriate nav keys', async () => {
    const counters = await service.getCounters(clientCtx);

    expect(counters).toBeDefined();
    expect(counters.tickets).toBeDefined();
    expect(counters.tickets.count).toBe(3);
    expect(counters.tickets.latestAt).toBe('2026-09-21T10:00:00.000Z');
    expect(mockRepo.countTickets).toHaveBeenCalledWith(clientCtx, expect.any(Date));
  });

  it('queries counts for technician role and returns tickets and maintenance', async () => {
    const counters = await service.getCounters(techCtx);

    expect(counters).toHaveProperty('tickets');
    expect(counters).toHaveProperty('maintenance');
    expect(counters.tickets.count).toBe(3);
    expect(counters.maintenance.count).toBe(2);
  });

  it('calls upsertSeen when markSeen is invoked', async () => {
    await service.markSeen(clientCtx, 'tickets');

    expect(mockRepo.upsertSeen).toHaveBeenCalledWith(clientCtx, 'tickets');
  });
});
