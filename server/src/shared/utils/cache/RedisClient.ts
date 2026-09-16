import Redis, { RedisOptions } from 'ioredis';
import { env } from '@shared/config/env';
import { logger } from '@shared/utils/logger';

export type RedisHealthState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'disabled';

export interface RedisHealth {
  state: RedisHealthState;
  isReady: boolean;
  lastError: string | null;
  operationsCount: number;
}

/**
 * Service managing Redis connection lifecycle, auto-reconnection strategies, health state tracking, and graceful fallback gating.
 */
export class RedisClientService {
  private client: Redis | null = null;
  private healthState: RedisHealthState = 'disconnected';
  private lastError: string | null = null;
  private operationsCount = 0;
  private isConnecting = false;

  /**
   * Initializes RedisClientService and triggers client connection if REDIS_ENABLED is true.
   */
  constructor() {
    if (env.REDIS_ENABLED) {
      this.initClient();
    } else {
      this.healthState = 'disabled';
      logger.info('Redis cache is disabled via configuration. In-memory fallback active.');
    }
  }

  /**
   * Configures ioredis client with fail-fast options and retry policies.
   */
  private initClient(): void {
    if (this.client) return;

    const options: RedisOptions = {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      db: env.REDIS_DB,
      connectTimeout: env.REDIS_TIMEOUT_MS,
      maxRetriesPerRequest: 1, // Don't hang pending requests if Redis is down
      enableOfflineQueue: false, // Immediately fail fast to fallback if disconnected
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 200, 5000);
        logger.warn(`Redis connection retry attempt ${times} in ${delay}ms...`);
        return delay;
      },
      reconnectOnError: (err: Error) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        if (targetErrors.some((e) => err.message.includes(e))) {
          return true;
        }
        return false;
      },
      lazyConnect: true,
    };

    try {
      this.client = new Redis(options);
      this.bindEvents();
      this.connect();
    } catch (err: any) {
      this.healthState = 'disconnected';
      this.lastError = err?.message || String(err);
      logger.error('Failed to initialize Redis client', { error: this.lastError });
    }
  }

  /**
   * Binds lifecycle event listeners to the ioredis instance.
   */
  private bindEvents(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.healthState = 'connecting';
      logger.info('Connecting to Redis server...');
    });

    this.client.on('ready', () => {
      this.healthState = 'connected';
      this.lastError = null;
      logger.info(`Redis connected and ready (${env.REDIS_HOST}:${env.REDIS_PORT}, DB: ${env.REDIS_DB})`);
    });

    this.client.on('error', (err) => {
      this.healthState = 'disconnected';
      this.lastError = err.message;
      logger.warn('Redis error encountered — failing fast to fallback cache', { error: err.message });
    });

    this.client.on('reconnecting', () => {
      this.healthState = 'reconnecting';
    });

    this.client.on('end', () => {
      this.healthState = 'disconnected';
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Connects to the Redis cluster/server.
   */
  private async connect(): Promise<void> {
    if (!this.client || this.isConnecting || this.healthState === 'connected') return;

    this.isConnecting = true;
    try {
      await this.client.connect();
    } catch (err: any) {
      this.healthState = 'disconnected';
      this.lastError = err?.message || String(err);
      logger.warn('Initial Redis connection failed — using in-memory fallback', { error: this.lastError });
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Evaluates if Redis is currently connected and capable of executing commands.
   *
   * @returns True if ready, false otherwise
   */
  isReady(): boolean {
    return this.client !== null && this.healthState === 'connected' && this.client.status === 'ready';
  }

  /**
   * Retrieves active Redis client or null if offline/degraded.
   *
   * @returns Active Redis instance or null
   */
  getClient(): Redis | null {
    return this.isReady() ? this.client : null;
  }

  /**
   * Creates a duplicate Redis connection configured for Pub/Sub subscriptions.
   *
   * @returns Dedicated Redis subscriber instance or null if Redis is disabled/not initialized
   */
  createSubscriberClient(): Redis | null {
    if (!this.client) return null;
    try {
      return this.client.duplicate();
    } catch (err: any) {
      logger.error('Failed to create Redis subscriber client duplicate', { error: err?.message || String(err) });
      return null;
    }
  }

  /**
   * Returns current Redis health status, readiness, error, and total command count.
   *
   * @returns RedisHealth snapshot
   */
  getHealth(): RedisHealth {
    return {
      state: this.healthState,
      isReady: this.isReady(),
      lastError: this.lastError,
      operationsCount: this.operationsCount,
    };
  }

  /**
   * Increments operations counter for metrics reporting.
   */
  incrementOps(): void {
    this.operationsCount++;
  }

  /**
   * Gracefully shuts down the Redis connection.
   */
  async quit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      } finally {
        this.client = null;
        this.healthState = 'disconnected';
      }
    }
  }
}

export const redisClientService = new RedisClientService();
