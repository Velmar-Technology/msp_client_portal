import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RmmTelemetryRepository } from './RmmTelemetryRepository';

// Setup chaining mock for Drizzle insert().values().onConflictDoUpdate().returning()
const mockReturning = vi.fn();
const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

vi.mock('@shared/db', () => ({
  db: {
    insert: (...args: any[]) => mockInsert(...args),
    select: vi.fn(),
  },
  rmmDeviceTelemetry: {
    id: 'id',
    equipment_id: 'equipment_id',
    tenant_id: 'tenant_id',
    zabbix_host_id: 'zabbix_host_id',
    agent_status: 'agent_status',
    cpu_usage: 'cpu_usage',
    memory_usage: 'memory_usage',
    disk_usage: 'disk_usage',
    disk_used_gb: 'disk_used_gb',
    disk_total_gb: 'disk_total_gb',
    pending_patch_count: 'pending_patch_count',
    last_sync_at: 'last_sync_at',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },
  subscriptionEquipment: {
    id: 'id',
    device_name: 'device_name',
    device_serial: 'device_serial',
  },
}));

describe('RmmTelemetryRepository Atomic Upsert & Batch Upsert', () => {
  let repository: RmmTelemetryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new RmmTelemetryRepository();
  });

  describe('upsertTelemetry', () => {
    it('executes a single atomic onConflictDoUpdate query with defaults', async () => {
      const mockResult = {
        id: 'telemetry-1',
        equipment_id: 'eq-123',
        tenant_id: 'tenant-abc',
        agent_status: 'ONLINE',
        cpu_usage: 42.5,
        memory_usage: 68.1,
        disk_usage: 55.0,
      };
      mockReturning.mockResolvedValueOnce([mockResult]);

      const result = await repository.upsertTelemetry({
        equipment_id: 'eq-123',
        tenant_id: 'tenant-abc',
        cpu_usage: 42.5,
        memory_usage: 68.1,
        disk_usage: 55.0,
      });

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment_id: 'eq-123',
          tenant_id: 'tenant-abc',
          agent_status: 'ONLINE',
          cpu_usage: 42.5,
          memory_usage: 68.1,
          disk_usage: 55.0,
          pending_patch_count: 0,
        })
      );

      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'equipment_id',
          set: expect.objectContaining({
            cpu_usage: 42.5,
            memory_usage: 68.1,
            disk_usage: 55.0,
          }),
        })
      );

      expect(result).toEqual(mockResult);
    });

    it('only includes provided fields in onConflictDoUpdate updateSet', async () => {
      const mockResult = { id: 'telemetry-2', equipment_id: 'eq-456', tenant_id: 'tenant-abc' };
      mockReturning.mockResolvedValueOnce([mockResult]);

      await repository.upsertTelemetry({
        equipment_id: 'eq-456',
        tenant_id: 'tenant-abc',
        pending_patch_count: 5,
      });

      const setArg = mockOnConflictDoUpdate.mock.calls[0][0].set;
      expect(setArg.pending_patch_count).toBe(5);
      expect(setArg.cpu_usage).toBeUndefined();
      expect(setArg.memory_usage).toBeUndefined();
      expect(setArg.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('upsertTelemetryBatch', () => {
    it('returns empty array immediately if batch items are empty', async () => {
      const results = await repository.upsertTelemetryBatch([]);
      expect(results).toEqual([]);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('executes atomic batch insert with EXCLUDED column mapping', async () => {
      const mockBatch = [
        { id: 't-1', equipment_id: 'eq-1', cpu_usage: 10 },
        { id: 't-2', equipment_id: 'eq-2', cpu_usage: 20 },
      ];
      mockReturning.mockResolvedValueOnce(mockBatch);

      const items = [
        { equipment_id: 'eq-1', tenant_id: 'tenant-1', cpu_usage: 10 },
        { equipment_id: 'eq-2', tenant_id: 'tenant-1', cpu_usage: 20 },
      ];

      const results = await repository.upsertTelemetryBatch(items);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ equipment_id: 'eq-1', cpu_usage: 10, agent_status: 'ONLINE' }),
          expect.objectContaining({ equipment_id: 'eq-2', cpu_usage: 20, agent_status: 'ONLINE' }),
        ])
      );
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: 'equipment_id',
        })
      );
      expect(results).toEqual(mockBatch);
    });
  });
});
