import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryBufferService } from './TelemetryBufferService';
import { TelemetryUpsertPayload } from '../repositories/RmmTelemetryRepository';

describe('TelemetryBufferService', () => {
  let mockRepo: any;
  let mockRedis: any;
  let mockRedisService: any;
  let service: TelemetryBufferService;

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
        equipment_id: 'eq-999',
        tenant_id: 'tenant-1',
        agent_status: 'ONLINE',
        cpu_usage: 15.5,
        memory_usage: 45.2,
      };

      await service.bufferPing(payload);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.hset).toHaveBeenCalledWith(
        'telemetry:device:eq-999',
        expect.objectContaining({
          equipment_id: 'eq-999',
          tenant_id: 'tenant-1',
          agent_status: 'ONLINE',
          cpu_usage: '15.5',
          memory_usage: '45.2',
        })
      );
      expect(mockPipeline.expire).toHaveBeenCalledWith('telemetry:device:eq-999', 86400);
      expect(mockPipeline.sadd).toHaveBeenCalledWith('telemetry:dirty_devices', 'eq-999');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('falls back to in-memory buffer when Redis is offline', async () => {
      mockRedisService.getClient.mockReturnValue(null);

      const payload: TelemetryUpsertPayload = {
        equipment_id: 'eq-local-1',
        tenant_id: 'tenant-1',
        cpu_usage: 25.0,
      };

      await service.bufferPing(payload);

      // Now flush from memory
      const flushed = await service.flushBatch();
      expect(flushed).toBe(1);
      expect(mockRepo.upsertTelemetryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ equipment_id: 'eq-local-1', cpu_usage: 25.0 })])
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
        equipment_id: 'eq-throw-1',
        tenant_id: 'tenant-1',
        cpu_usage: 30.0,
      };

      await service.bufferPing(payload);

      // Memory buffer holds fallback
      mockRedisService.getClient.mockReturnValue(null);
      const flushed = await service.flushBatch();
      expect(flushed).toBe(1);
      expect(mockRepo.upsertTelemetryBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ equipment_id: 'eq-throw-1', cpu_usage: 30.0 })])
      );
    });
  });

  describe('flushBatch', () => {
    it('pops dirty device IDs, fetches hashes via pipeline, and executes upsertTelemetryBatch', async () => {
      mockRedis.spop.mockResolvedValue(['eq-1', 'eq-2']);

      const readPipeline = {
        hgetall: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [
            null,
            {
              equipment_id: 'eq-1',
              tenant_id: 'tenant-1',
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
              equipment_id: 'eq-2',
              tenant_id: 'tenant-1',
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
          expect.objectContaining({ equipment_id: 'eq-1', cpu_usage: 22.0 }),
          expect.objectContaining({ equipment_id: 'eq-2', cpu_usage: 11.0 }),
        ])
      );
    });

    it('returns 0 and avoids query if dirty set is empty', async () => {
      mockRedis.spop.mockResolvedValue([]);

      const flushed = await service.flushBatch();
      expect(flushed).toBe(0);
      expect(mockRepo.upsertTelemetryBatch).not.toHaveBeenCalled();
    });

    it('prevents concurrent overlapping flushes', async () => {
      mockRedis.spop.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(['eq-1']), 50))
      );
      const readPipeline = {
        hgetall: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, { equipment_id: 'eq-1', tenant_id: 't-1' }]]),
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
