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

export class RedisClientService {
  private client: Redis | null = null;
  private healthState: RedisHealthState = 'disconnected';
  private lastError: string | null = null;
  private operationsCount = 0;
  private isConnecting = false;

  constructor() {
    if (env.REDIS_ENABLED) {
      this.initClient();
    } else {
      this.healthState = 'disabled';
      logger.info('Redis cache is disabled via configuration. In-memory fallback active.');
    }
  }

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
   * Returns true only when Redis is fully connected and capable of executing commands.
   */
  isReady(): boolean {
    return this.client !== null && this.healthState === 'connected' && this.client.status === 'ready';
  }

  getClient(): Redis | null {
    return this.isReady() ? this.client : null;
  }

  getHealth(): RedisHealth {
    return {
      state: this.healthState,
      isReady: this.isReady(),
      lastError: this.lastError,
      operationsCount: this.operationsCount,
    };
  }

  incrementOps(): void {
    this.operationsCount++;
  }

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
