import { ticketService } from './TicketService';
import { logger } from '../utils/logger';

export class EscalationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

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

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Escalation Scheduler stopped');
    }
  }

  async process(): Promise<void> {
    const { escalated } = await ticketService.processPendingEscalations();
    if (escalated > 0) {
      logger.info(`Escalation sweep escalated ${escalated} ticket(s)`);
    }
  }
}

export const escalationScheduler = new EscalationScheduler();
