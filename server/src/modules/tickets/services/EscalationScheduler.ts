import { escalationService, EscalationService } from '@modules/tickets/services/EscalationService';
import { logger } from '@shared/utils/logger';

/**
 * Background scheduler periodically executing ticket escalation sweeps across pending open tickets.
 *
 * @see BL-104 (Tier Escalation)
 */
export class EscalationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Initializes EscalationScheduler with EscalationService dependency.
   *
   * @param escalationSvc - Escalation domain service
   */
  constructor(private escalationSvc: EscalationService = escalationService) {}

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
   * Runs an individual escalation evaluation sweep.
   */
  async process(): Promise<void> {
    const { escalated } = await this.escalationSvc.processPendingEscalations();
    if (escalated > 0) {
      logger.info(`Escalation sweep escalated ${escalated} ticket(s)`);
    }
  }
}

export const escalationScheduler = new EscalationScheduler();
