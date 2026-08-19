import { Pool, PoolClient } from 'pg';
import { env } from './env';
import { logger } from '@shared/utils/logger';

// ---------------------------------------------------------------------------
// Connection pool
// ---------------------------------------------------------------------------

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

// ---------------------------------------------------------------------------
// Health state machine
// ---------------------------------------------------------------------------

type PoolHealthState = 'healthy' | 'degraded' | 'down';

export interface PoolHealth {
  state: PoolHealthState;
  lastCheckAt: Date | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  uptimeMs: number;
}

const DEGRADED_THRESHOLD = 1;
const RECOVERY_THRESHOLD = 2;
const PING_INTERVAL_MS = 30_000;

const health: PoolHealth = {
  state: 'healthy',
  lastCheckAt: null,
  consecutiveFailures: 0,
  consecutiveSuccesses: 0,
  uptimeMs: Date.now(),
};

function transitionState(newState: PoolHealthState) {
  if (health.state === newState) return;
  const prev = health.state;
  health.state = newState;

  if (newState === 'degraded' && prev === 'healthy') {
    logger.warn('PostgreSQL connection degraded - ping failed', {
      consecutiveFailures: health.consecutiveFailures,
    });
  } else if (newState === 'down') {
    logger.error('PostgreSQL connection DOWN - consecutive ping failures exceeded threshold', {
      consecutiveFailures: health.consecutiveFailures,
    });
  } else if (newState === 'healthy' && (prev === 'degraded' || prev === 'down')) {
    logger.info('PostgreSQL connection restored', { previousState: prev });
  }
}

function evaluateHealth(pingOk: boolean) {
  health.lastCheckAt = new Date();

  if (pingOk) {
    health.consecutiveFailures = 0;
    health.consecutiveSuccesses++;

    if (health.state !== 'healthy' && health.consecutiveSuccesses >= RECOVERY_THRESHOLD) {
      transitionState('healthy');
    }
  } else {
    health.consecutiveSuccesses = 0;
    health.consecutiveFailures++;

    if (health.consecutiveFailures >= DEGRADED_THRESHOLD && health.state === 'healthy') {
      transitionState('degraded');
    }
    if (health.consecutiveFailures >= 3 && health.state === 'degraded') {
      transitionState('down');
    }
  }
}

// ---------------------------------------------------------------------------
// Background pinger
// ---------------------------------------------------------------------------

async function pingDatabase(): Promise<boolean> {
  let client: PoolClient | null = null;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    client?.release();
  }
}

let pingerStarted = false;

function startPinger() {
  if (pingerStarted) return;
  pingerStarted = true;

  const tick = async () => {
    const ok = await pingDatabase();
    evaluateHealth(ok);
  };

  tick();
  setInterval(tick, PING_INTERVAL_MS);

  logger.info('PostgreSQL health pinger started', { intervalMs: PING_INTERVAL_MS });
}

startPinger();

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function getPoolHealth(): PoolHealth {
  return { ...health };
}

/**
 * Retry a function on transient connection errors with exponential backoff.
 * Non-transient errors are re-thrown immediately.
 */
const TRANSIENT_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  '57P01',
  '57P03',
  '57P04',
  '57P05',
  '08000',
  '08003',
  '08006',
  '08001',
  '08004',
]);

function isTransientError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return TRANSIENT_CODES.has((err as { code: string }).code);
  }
  return false;
}

export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isTransientError(err) || attempt === maxRetries) {
        throw err;
      }

      const delayMs = 200 * Math.pow(2, attempt);
      logger.warn('Transient DB error - retrying query', {
        attempt: attempt + 1,
        maxRetries,
        delayMs,
        code: (err as { code?: string }).code,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Initial connection test (called at boot)
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('PostgreSQL connected successfully');
  } catch (error) {
    logger.error('PostgreSQL connection failed', { error });
    throw error;
  }
}
