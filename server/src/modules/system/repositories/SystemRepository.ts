import { db, getPoolHealth, type PoolHealthStatus } from '@shared/db';
import { sql } from 'drizzle-orm';

export interface DbHealthResult {
  latencyMs: number;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  message: string;
}

/**
 * Repository performing low-level database connection pool health inspections and ping latency measurements.
 */
export class SystemRepository {
  /**
   * Initializes SystemRepository with database pool reference.
   *
   * @param dbInstance - Drizzle database instance
   */
  constructor(private dbInstance = db) {}

  /**
   * Retrieves connection pool health metrics (active connections, failure counts, state).
   *
   * @returns PoolHealthStatus
   */
  getPoolHealth(): PoolHealthStatus {
    return getPoolHealth();
  }

  /**
   * Pings the PostgreSQL database with SELECT 1 and calculates connection latency and health state.
   *
   * @returns DbHealthResult status, latencyMs, and message
   */
  async pingDatabase(): Promise<DbHealthResult> {
    const start = Date.now();
    const poolHealth = this.getPoolHealth();
    try {
      await this.dbInstance.execute(sql`SELECT 1`);
      const latency = Date.now() - start;
      if (poolHealth.state === 'down') {
        return {
          status: 'DOWN',
          latencyMs: latency,
          message: `Pool reports DOWN (${poolHealth.consecutiveFailures} consecutive failures)`,
        };
      }
      if (poolHealth.state === 'degraded' || latency > 300) {
        return {
          status: 'DEGRADED',
          latencyMs: latency,
          message:
            poolHealth.state === 'degraded'
              ? `Pool degraded (${poolHealth.consecutiveFailures} consecutive failures)`
              : `High latency (${latency}ms)`,
        };
      }
      return {
        status: 'OPERATIONAL',
        latencyMs: latency,
        message: 'Database connection healthy',
      };
    } catch (err: any) {
      return {
        status: 'DOWN',
        latencyMs: Date.now() - start,
        message: err?.message || 'Database connection error',
      };
    }
  }
}

export const systemRepository = new SystemRepository();
