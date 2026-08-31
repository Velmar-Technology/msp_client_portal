import { escalationService, EscalationService } from '@modules/tickets/services/EscalationService';
import { DistributedLock, distributedLock } from '@shared/utils/cache/DistributedLock';
import { logger } from '@shared/utils/logger';

const ESCALATION_SWEEP_LOCK_KEY = 'cron:tickets:escalation_sweep';
const ESCALATION_SWEEP_LOCK_TTL_MS = 50_000;

/**
 * Background scheduler periodically executing ticket escalation sweeps across pending open tickets.
 *
 * Coordinates multi-instance executions using Redis distributed locking to prevent duplicate assignments.
 *
 * @see BL-104 (Tier Escalation)
 */
export class EscalationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Initializes EscalationScheduler with EscalationService and DistributedLock dependencies.
   *
   * @param escalationSvc - Escalation domain service
   * @param lock - Distributed concurrency lock manager
   */
  constructor(
    private escalationSvc: EscalationService = escalationService,
    private lock: DistributedLock = distributedLock,
  ) {}

  /**
   * Starts the recurring background timer to evaluate and escalate stale tickets.
   *
   * @param intervalMs - Polling interval in milliseconds (defaults to 60,000ms / 1 min)
   */
  start(intervalMs = 60000): void {
    if (this.intervalId) return;

    logger.info('Escalation Scheduler started');

    // Run immediately on start, then periodically
    this.process().catch((err) => {
      logger.error('Error during initial escalation check', { err });
    });

    this.intervalId = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.process();
      } catch (err) {
        logger.error('Error in escalation scheduler loop', { err });
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  /**
   * Stops the recurring background escalation polling timer.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Escalation Scheduler stopped');
    }
  }

  /**
   * Runs an individual escalation evaluation sweep across pending open tickets.
   *
   * Obtains an exclusive distributed lock before evaluating candidates to prevent
   * conflicting technician assignments across concurrent cluster workers.
   */
  async process(): Promise<void> {
    const token = await this.lock.acquireLock(ESCALATION_SWEEP_LOCK_KEY, ESCALATION_SWEEP_LOCK_TTL_MS);
    if (!token) {
      logger.debug('Escalation sweep skipped: lock held by another cluster instance');
      return;
    }

    try {
      const { escalated } = await this.escalationSvc.processPendingEscalations();
      if (escalated > 0) {
        logger.info(`Escalation sweep escalated ${escalated} ticket(s)`);
      }
    } finally {
      await this.lock.releaseLock(ESCALATION_SWEEP_LOCK_KEY, token);
    }
  }
}

export const escalationScheduler = new EscalationScheduler();

