import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserContext, UserRole } from '@shared/types';

const { mockSelect, mockFrom, mockWhere, mockLimit, mockInsert, mockValues, mockUpdate, mockSet } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockLimit: vi.fn(),
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
}));

vi.mock('@shared/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  },
  userNavViews: { id: 'id', user_id: 'user_id', nav_key: 'nav_key', last_seen_at: 'last_seen_at' },
  tickets: { id: 'id', client_id: 'client_id', assigned_tech_id: 'assigned_tech_id', tenant_id: 'tenant_id', status: 'status', created_at: 'created_at', updated_at: 'updated_at' },
  ticketResponses: { ticket_id: 'ticket_id', user_id: 'user_id', created_at: 'created_at', is_internal: 'is_internal' },
  rmmAlerts: { tenant_id: 'tenant_id', created_at: 'created_at' },
  deviceMaintenances: { tenant_id: 'tenant_id', updated_at: 'updated_at' },
  invoices: { tenant_id: 'tenant_id', created_at: 'created_at' },
  leads: { tenant_id: 'tenant_id', updated_at: 'updated_at' },
  notifications: { user_id: 'user_id', read: 'read', created_at: 'created_at' },
}));

import { NavCounterService } from './NavCounterService';

describe('NavCounterService — Actionable Unread Calculations', () => {
  let service: NavCounterService;

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
    service = new NavCounterService();

    // Query builder chaining:
    // .select().from().where() can either resolve as promise (for count queries) OR have .limit() (for seenAt queries)
    const whereResult = Promise.resolve([{ cnt: 3, latest: '2026-09-21T10:00:00.000Z' }]) as any;
    whereResult.limit = mockLimit;
    mockLimit.mockResolvedValue([]);

    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue(whereResult);

    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([]);
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  });

  it('queries counts for client role with appropriate nav keys', async () => {
    mockLimit.mockResolvedValue([]);

    const counters = await service.getCounters(clientCtx);

    expect(counters).toBeDefined();
    expect(counters.tickets).toBeDefined();
    expect(counters.tickets.count).toBe(3);
    expect(counters.tickets.latestAt).toBe('2026-09-21T10:00:00.000Z');
  });

  it('queries counts for technician role and returns tickets and maintenance', async () => {
    mockLimit.mockResolvedValue([{ last_seen_at: new Date('2026-09-20T00:00:00.000Z') }]);

    const counters = await service.getCounters(techCtx);

    expect(counters).toHaveProperty('tickets');
    expect(counters).toHaveProperty('maintenance');
    expect(counters.tickets.count).toBe(3);
  });

  it('updates existing userNavView when markSeen is called', async () => {
    mockLimit.mockResolvedValue([{ id: 'existing-view-123' }]);

    await service.markSeen(clientCtx, 'tickets');

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalled();
  });

  it('inserts new userNavView when markSeen is called for first time', async () => {
    mockLimit.mockResolvedValue([]);

    await service.markSeen(clientCtx, 'tickets');

    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: clientCtx.userId,
        nav_key: 'tickets',
        tenant_id: clientCtx.tenantId,
      }),
    );
  });
});
