import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryBufferService } from './TelemetryBufferService';
import { TelemetryUpsertPayload } from '../repositories/RmmTelemetryRepository';

describe('TelemetryBufferService', () => {
  let mockRepo: any;
  let mockRedis: any;
  let mockRedisService: any;
  let service: TelemetryBufferService;

  const validEquipId1 = '11111111-1111-1111-1111-111111111111';
  const validEquipId2 = '22222222-2222-2222-2222-222222222222';
  const validTenantId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      upsertTelemetryBatch: vi.fn().mockResolvedValue([]),
      upsertTelemetry: vi.fn().mockResolvedValue({}),
    };

    mockRedis = {
      pipeline: vi.fn(),
      spop: vi.fn(),
    };

    mockRedisService = {
      getClient: vi.fn().mockReturnValue(mockRedis),
    };

    // Instantiate with autoStart: false to control flush ticks explicitly in tests
    service = new TelemetryBufferService(mockRepo, mockRedisService, {
      flushIntervalMs: 1000,
      maxBatchSize: 100,
      autoStart: false,
    });
  });

  afterEach(async () => {
    await service.stop();
  });

  describe('bufferPing', () => {
    it('writes to Redis hash, sets TTL, and registers dirty set via pipeline', async () => {
      const mockPipeline = {
        hset: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 'OK']]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const payload: TelemetryUpsertPayload = {
        equipment_id: validEquipId1,
        tenant_id: validTenantId,
        agent_status: 'ONLINE',
        cpu_usage: 15.5,
        memory_usage: 45.2,
      };

      await service.bufferPing(payload);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        `telemetry:device:${validEquipId1}`,
        expect.objectContaining({
          equipment_id: validEquipId1,
          tenant_id: validTenantId,
          agent_status: 'ONLINE',
          cpu_usage: '15.5',
          memory_usage: '45.2',
        })
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith(`telemetry:device:${validEquipId1}`, 86400);
      expect(mockPipeline.sadd).toHaveBeenCalledWith('telemetry:dirty_devices', validEquipId1);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('rejects and drops bufferPing when equipment_id or tenant_id is not a valid UUID', async () => {
      const mockPipeline = {
        hset: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 'OK']]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      await service.bufferPing({
        equipment_id: 'eq-not-uuid',
        tenant_id: validTenantId,
        cpu_usage: 10,
      });

      await service.bufferPing({
        equipment_id: validEquipId1,
        tenant_id: 'tenant-not-uuid',
        cpu_usage: 10,
      });

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('falls back to in-memory buffer when Redis is offline', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const payload: TelemetryUpsertPayload = {
        equipment_id: validEquipId1,
        tenant_id: validTenantId,
        cpu_usage: 25.0,
      };

      await service.bufferPing(payload);

      // Now flush from memory
      const flushed = await service.flushBatch();
      expect(flushed).toBe(1);
      expect(mockRepo.upsertTelemetryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ equipment_id: validEquipId1, cpu_usage: 25.0 })])
      );
    });

    it('falls back to in-memory buffer when Redis pipeline throws', async () => {
      const mockPipeline = {
        hset: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        sadd: vi.fn().mockReturnThis(),
        exec: vi.fn().mockRejectedValue(new Error('Redis connection timeout')),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const payload: TelemetryUpsertPayload = {
        equipment_id: validEquipId2,
        tenant_id: validTenantId,
        cpu_usage: 30.0,
      };

      await service.bufferPing(payload);

      // Memory buffer holds fallback
      mockRedisService.getClient.mockReturnValue(null);
      const flushed = await service.flushBatch();
      expect(flushed).toBe(1);
      expect(mockRepo.upsertTelemetryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ equipment_id: validEquipId2, cpu_usage: 30.0 })])
      );
    });
  });

  describe('flushBatch', () => {
    it('pops dirty device IDs, fetches hashes via pipeline, and executes upsertTelemetryBatch for valid UUIDs', async () => {
      mockRedis.spop.mockResolvedValue([validEquipId1, validEquipId2]);

      const readPipeline = {
        hgetall: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [
            null,
            {
              equipment_id: validEquipId1,
              tenant_id: validTenantId,
              agent_status: 'ONLINE',
              cpu_usage: '22.0',
              memory_usage: '40.0',
              disk_usage: '50.0',
              disk_used_gb: '100',
              disk_total_gb: '200',
              pending_patch_count: '2',
              last_sync_at: new Date().toISOString(),
            },
          ],
          [
            null,
            {
              equipment_id: validEquipId2,
              tenant_id: validTenantId,
              agent_status: 'ONLINE',
              cpu_usage: '11.0',
              memory_usage: '30.0',
              disk_usage: '20.0',
              disk_used_gb: '50',
              disk_total_gb: '250',
              pending_patch_count: '0',
              last_sync_at: new Date().toISOString(),
            },
          ],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(readPipeline);

      const flushed = await service.flushBatch(100);

      expect(flushed).toBe(2);
      expect(mockRedis.spop).toHaveBeenCalledWith('telemetry:dirty_devices', 100);
      expect(mockRepo.upsertTelemetryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ equipment_id: validEquipId1, cpu_usage: 22.0 }),
          expect.objectContaining({ equipment_id: validEquipId2, cpu_usage: 11.0 }),
        ])
      );
    });

    it('filters out non-UUID records from Redis and purges their device hash keys', async () => {
      mockRedis.spop.mockResolvedValue(['invalid-eq-01', validEquipId1]);

      const readPipeline = {
        hgetall: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [
            null,
            {
              equipment_id: 'invalid-eq-01',
              tenant_id: 'tenant-123',
              cpu_usage: '44.5',
            },
          ],
          [
            null,
            {
              equipment_id: validEquipId1,
              tenant_id: validTenantId,
              cpu_usage: '20.0',
            },
          ],
        ]),
      };
      mockRedis.pipeline.mockReturnValue(readPipeline);

      const flushed = await service.flushBatch(100);

      expect(flushed).toBe(1);
      expect(readPipeline.del).toHaveBeenCalledWith('telemetry:device:invalid-eq-01');
      expect(mockRepo.upsertTelemetryBatch).toHaveBeenCalledWith([
        expect.objectContaining({ equipment_id: validEquipId1, cpu_usage: 20.0 }),
      ]);
    });

    it('returns 0 and avoids query if dirty set is empty', async () => {
      mockRedis.spop.mockResolvedValue([]);

      const flushed = await service.flushBatch();
      expect(flushed).toBe(0);
      expect(mockRepo.upsertTelemetryBatch).not.toHaveBeenCalled();
    });

    it('prevents concurrent overlapping flushes', async () => {
      mockRedis.spop.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([validEquipId1]), 50))
      );
      const readPipeline = {
        hgetall: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, { equipment_id: validEquipId1, tenant_id: validTenantId }]]),
      };
      mockRedis.pipeline.mockReturnValue(readPipeline);

      const [firstFlush, secondFlush] = await Promise.all([
        service.flushBatch(),
        service.flushBatch(),
      ]);

      expect(firstFlush).toBe(1);
      expect(secondFlush).toBe(0); // Second concurrent call early-exits
    });
  });
});
