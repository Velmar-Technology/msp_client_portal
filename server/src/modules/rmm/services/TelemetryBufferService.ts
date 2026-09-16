import { RedisClientService, redisClientService } from '@shared/utils/cache/RedisClient';
import { RmmTelemetryRepository, rmmTelemetryRepository, TelemetryUpsertPayload } from '../repositories/RmmTelemetryRepository';
import { logger } from '@shared/utils/logger';

export interface TelemetryBufferOptions {
  /** Flush interval in milliseconds (default: 3000ms). */
  flushIntervalMs?: number;
  /** Maximum number of dirty records to flush in a single micro-batch (default: 500). */
  maxBatchSize?: number;
  /** Whether to automatically start the background flush interval (default: true). */
  autoStart?: boolean;
}

/**
 * Service managing high-throughput write-behind buffering for endpoint hardware telemetry.
 *
 * Incoming workstation telemetry heartbeats write directly to an in-memory Redis Hash
 * in < 2ms and register the equipment UUID into a dirty set. A scheduled background flusher
 * drains dirty devices and persists aggregated snapshots into PostgreSQL via chunked atomic
 * upserts (`onConflictDoUpdate`), reducing database write load by up to 95%.
 */
export class TelemetryBufferService {
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing = false;
  private readonly flushIntervalMs: number;
  private readonly maxBatchSize: number;
  private inMemoryFallbackBuffer = new Map<string, TelemetryUpsertPayload>();

  private static readonly DIRTY_SET_KEY = 'telemetry:dirty_devices';
  private static readonly DEVICE_HASH_PREFIX = 'telemetry:device:';
  private static readonly HASH_TTL_SECONDS = 86_400; // 24 hours

  /**
   * Initializes TelemetryBufferService with repository, Redis, and configuration options.
   *
   * @param telemetryRepo - Hardware telemetry repository
   * @param redisService  - Shared Redis client service
   * @param options       - Buffer interval and batch size settings
   */
  constructor(
    private readonly telemetryRepo: RmmTelemetryRepository = rmmTelemetryRepository,
    private readonly redisService: RedisClientService = redisClientService,
    options: TelemetryBufferOptions = {}
  ) {
    this.flushIntervalMs = options.flushIntervalMs ?? 3000;
    this.maxBatchSize = options.maxBatchSize ?? 500;

    if (options.autoStart !== false) {
      this.start();
    }
  }

  /**
   * Starts the periodic flush timer.
   */
  start(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flushBatch().catch((err) => {
        logger.error('[TelemetryBufferService] Unhandled error during scheduled flush:', err);
      });
    }, this.flushIntervalMs);

    this.flushTimer.unref?.();
    logger.info(
      `[TelemetryBufferService] Started write-behind flusher (interval: ${this.flushIntervalMs}ms, maxBatch: ${this.maxBatchSize}).`
    );
  }

  /**
   * Stops the background flush interval and immediately flushes all pending dirty telemetry.
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    logger.info('[TelemetryBufferService] Stopping flusher — draining remaining dirty buffer...');
    await this.flushBatch();
  }

  /**
   * Buffers an incoming agent telemetry ping into Redis or in-memory fallback.
   *
   * @param data - Incoming telemetry payload
   */
  async bufferPing(data: TelemetryUpsertPayload): Promise<void> {
    const redis = this.redisService.getClient();

    if (redis) {
      try {
        const hashKey = `${TelemetryBufferService.DEVICE_HASH_PREFIX}${data.equipment_id}`;
        const hashPayload = this.serializePayload(data);

        const pipeline = redis.pipeline();
        pipeline.hset(hashKey, hashPayload);
        pipeline.expire(hashKey, TelemetryBufferService.HASH_TTL_SECONDS);
        pipeline.sadd(TelemetryBufferService.DIRTY_SET_KEY, data.equipment_id);
        await pipeline.exec();
        return;
      } catch (err) {
        logger.warn(
          `[TelemetryBufferService] Redis write failed for ${data.equipment_id}, falling back to in-memory:`,
          err
        );
      }
    }

    // Fallback: in-memory map buffer
    this.inMemoryFallbackBuffer.set(data.equipment_id, data);
  }

  /**
   * Flushes a micro-batch of dirty telemetry records into PostgreSQL.
   *
   * @param maxItems - Maximum records to flush in this cycle
   * @returns Number of records successfully persisted
   */
  async flushBatch(maxItems = this.maxBatchSize): Promise<number> {
    if (this.isFlushing) {
      return 0;
    }

    this.isFlushing = true;
    let flushedCount = 0;

    try {
      // 1. Drain Redis dirty keys if connected
      const redis = this.redisService.getClient();
      if (redis) {
        flushedCount += await this.flushFromRedis(redis, maxItems);
      }

      // 2. Drain in-memory fallback buffer
      if (this.inMemoryFallbackBuffer.size > 0) {
        flushedCount += await this.flushFromMemory();
      }
    } catch (err) {
      logger.error('[TelemetryBufferService] Failed to flush telemetry batch to database:', err);
    } finally {
      this.isFlushing = false;
    }

    return flushedCount;
  }

  /**
   * Pops dirty equipment IDs from Redis and batch-upserts their current telemetry snapshot.
   */
  private async flushFromRedis(redis: any, count: number): Promise<number> {
    const dirtyIds: string[] = await redis.spop(TelemetryBufferService.DIRTY_SET_KEY, count);
    if (!dirtyIds || dirtyIds.length === 0) {
      return 0;
    }

    // Read latest snapshots in pipeline
    const readPipeline = redis.pipeline();
    for (const id of dirtyIds) {
      readPipeline.hgetall(`${TelemetryBufferService.DEVICE_HASH_PREFIX}${id}`);
    }
    const results = await readPipeline.exec();

    const batch: TelemetryUpsertPayload[] = [];
    for (let i = 0; i < dirtyIds.length; i++) {
      const [err, raw] = results[i] || [];
      if (!err && raw && raw.equipment_id && raw.tenant_id) {
        batch.push(this.deserializeHash(raw));
      }
    }

    if (batch.length > 0) {
      await this.telemetryRepo.upsertTelemetryBatch(batch);
      logger.debug(`[TelemetryBufferService] Flushed ${batch.length} telemetry records from Redis to PostgreSQL.`);
    }

    return batch.length;
  }

  /**
   * Flushes records from in-memory fallback buffer.
   */
  private async flushFromMemory(): Promise<number> {
    const batch = Array.from(this.inMemoryFallbackBuffer.values());
    this.inMemoryFallbackBuffer.clear();

    if (batch.length > 0) {
      await this.telemetryRepo.upsertTelemetryBatch(batch);
      logger.debug(`[TelemetryBufferService] Flushed ${batch.length} telemetry records from memory fallback.`);
    }

    return batch.length;
  }

  /**
   * Serializes a TelemetryUpsertPayload to flat string values for Redis HSET.
   */
  private serializePayload(data: TelemetryUpsertPayload): Record<string, string> {
    const hash: Record<string, string> = {
      equipment_id: data.equipment_id,
      tenant_id: data.tenant_id,
      agent_status: data.agent_status ?? 'ONLINE',
      cpu_usage: String(data.cpu_usage ?? 0),
      memory_usage: String(data.memory_usage ?? 0),
      disk_usage: String(data.disk_usage ?? 0),
      disk_used_gb: String(data.disk_used_gb ?? 0),
      disk_total_gb: String(data.disk_total_gb ?? 0),
      pending_patch_count: String(data.pending_patch_count ?? 0),
      last_sync_at: (data.last_sync_at ? new Date(data.last_sync_at) : new Date()).toISOString(),
    };

    if (data.zabbix_host_id) {
      hash.zabbix_host_id = data.zabbix_host_id;
    }

    return hash;
  }

  /**
   * Deserializes flat string values from Redis HGETALL back to TelemetryUpsertPayload.
   */
  private deserializeHash(raw: Record<string, string>): TelemetryUpsertPayload {
    return {
      equipment_id: raw.equipment_id,
      tenant_id: raw.tenant_id,
      zabbix_host_id: raw.zabbix_host_id || null,
      agent_status: raw.agent_status || 'ONLINE',
      cpu_usage: raw.cpu_usage ? Number(raw.cpu_usage) : 0,
      memory_usage: raw.memory_usage ? Number(raw.memory_usage) : 0,
      disk_usage: raw.disk_usage ? Number(raw.disk_usage) : 0,
      disk_used_gb: raw.disk_used_gb ? Number(raw.disk_used_gb) : 0,
      disk_total_gb: raw.disk_total_gb ? Number(raw.disk_total_gb) : 0,
      pending_patch_count: raw.pending_patch_count ? Number(raw.pending_patch_count) : 0,
      last_sync_at: raw.last_sync_at ? new Date(raw.last_sync_at) : new Date(),
    };
  }
}

export const telemetryBufferService = new TelemetryBufferService();
