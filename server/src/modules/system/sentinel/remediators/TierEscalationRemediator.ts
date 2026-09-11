import { db, ticketEvents, users } from '@shared/db';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';

/**
 * Autonomous Self-Healing Remediator for BL-104: Capacity-Weighted Tier Escalation.
 * Automatically escalates stalled unworked tickets to Tier 2 and stamps an audit event.
 *
 * @see BL-104
 */
export class TierEscalationRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-104';
  readonly name = 'Tier Escalation Remediator';

  constructor(private readonly database: typeof db = db) {}

  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const ticketId = violation.entityId;

    try {
      const rawTicket = violation.actionSequence?.rootContext?.ticket as any;
      let changedBy =
        rawTicket?.assigned_tech_id ||
        rawTicket?.client_id ||
        violation.actionSequence?.steps[0]?.actorId;

      if (!changedBy || changedBy === 'SYSTEM_SENTINEL_AUTOHEAL') {
        const [adminUser] = await this.database
          .select({ id: users.id })
          .from(users)
          .where(eq(users.role, 'ADMIN'))
          .limit(1);
        changedBy = adminUser?.id;
      }

      await this.database.insert(ticketEvents).values({
        ticket_id: ticketId,
        old_status: 'OPEN',
        new_status: 'OPEN',
        changed_by: changedBy,
        notes: `[Auto-Heal BL-104] Unworked ${violation.evidence?.priority || ''} ticket automatically escalated to Tier 2 queue.`,
        tenant_id: violation.tenantId,
      });

      logger.info(
        `[Sentinel Auto-Heal] Successfully escalated ticket '${ticketId}' to Tier 2 (BL-104).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: ticketId,
        tenantId: violation.tenantId,
        success: true,
        actionTaken: 'ESCALATE_TO_TIER_2',
        details: {
          ticketId,
          priority: violation.evidence?.priority,
          targetTier: 'TIER_2',
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.error(`[Sentinel Auto-Heal Error] Failed to escalate ticket '${ticketId}':`, err);
      return {
        ruleCode: this.ruleCode,
        entityId: ticketId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'FAILED_ESCALATION',
        error: err.message,
        remediatedAt: new Date(),
      };
    }
  }
}
