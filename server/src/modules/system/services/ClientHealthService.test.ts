import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientHealthService } from './ClientHealthService';
import { db } from '@shared/db';

vi.mock('@shared/db', () => ({
  db: {
    select: vi.fn(),
  },
  tickets: {},
  subscriptionEquipment: {
    id: 'id',
    status: 'status',
    device_name: 'device_name',
    agent_last_seen_at: 'agent_last_seen_at',
    tenant_id: 'tenant_id',
  },
  rmmDeviceTelemetry: {
    equipment_id: 'equipment_id',
    cpu_usage: 'cpu_usage',
    memory_usage: 'memory_usage',
    disk_usage: 'disk_usage',
    pending_patch_count: 'pending_patch_count',
    last_sync_at: 'last_sync_at',
  },
  tenants: {
    id: 'id',
    name: 'name',
  },
}));

describe('ClientHealthService (BL-601)', () => {
  let service: ClientHealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ClientHealthService();
  });

  it('should return 100% health when tenant has zero tickets and optimal hardware', async () => {
    (db.select as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'tenant-1', name: 'Acme Corp' }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'slot-1',
                status: 'ACTIVE',
                device_name: 'WS-01',
                last_sync_at: new Date().toISOString(),
                agent_last_seen_at: new Date().toISOString(),
                disk_usage: '30.00',
                memory_usage: '40.00',
                pending_patch_count: 0,
              },
            ]),
          }),
        }),
      });

    const report = await service.calculateScore('tenant-1');

    expect(report.tenantId).toBe('tenant-1');
    expect(report.tenantName).toBe('Acme Corp');
    expect(report.score).toBe(100);
    expect(report.ticketHealth).toBe(100);
    expect(report.hardwareHealth).toBe(100);
    expect(report.securityHealth).toBe(100);
    expect(report.openTicketCount).toBe(0);
    expect(report.criticalTicketCount).toBe(0);
    expect(report.recommendations[0]).toContain('optimal parameters');
  });

  it('should calculate weighted penalties when critical tickets and pending patches exist', async () => {
    (db.select as any)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'tenant-2', name: 'Beta Ltd' }]),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 't-1',
              status: 'OPEN',
              priority: 'CRITICAL',
              created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            },
          ]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: 'slot-1',
                status: 'ACTIVE',
                device_name: 'WS-02',
                last_sync_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                agent_last_seen_at: null,
                disk_usage: '92.00',
                memory_usage: '50.00',
                pending_patch_count: 4,
              },
            ]),
          }),
        }),
      });

    const report = await service.calculateScore('tenant-2');

    expect(report.openTicketCount).toBe(1);
    expect(report.criticalTicketCount).toBe(1);
    expect(report.slaBreachRisk).toBe(true);
    expect(report.score).toBeLessThan(70);
    expect(report.recommendations.some((r) => r.includes('QBR'))).toBe(true);
  });
});
