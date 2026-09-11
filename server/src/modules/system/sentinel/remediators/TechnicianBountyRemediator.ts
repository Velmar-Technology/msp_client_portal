import { db, technicianEarnings, expenses } from '@shared/db';
import { logger } from '@shared/utils/logger';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';
import {
  BASE_COMMISSION_RATE,
  PRIORITY_MULTIPLIERS,
  SLA_BONUS_RATE,
  OPEX_COMMISSION_CATEGORY,
} from '../checkers/financial/TechnicianBountyChecker';

/**
 * Autonomous Self-Healing Remediator for BL-801: Technician Commissions & OpEx Auto-Posting.
 * When a closed ticket is missing its commission or OpEx entry, calculates and ledgers the missing record.
 *
 * @see BL-801
 */
export class TechnicianBountyRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-801';
  readonly name = 'Technician Bounty & OpEx Remediator';

  constructor(private readonly database: typeof db = db) {}

  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const ticketId = violation.entityId;
    const priority = ((violation.evidence?.priority as string) || 'MEDIUM').toUpperCase();
    const multiplier = PRIORITY_MULTIPLIERS[priority] || 1.25;

    const baseAmount = BASE_COMMISSION_RATE * multiplier;
    const bonusAmount = SLA_BONUS_RATE;
    const totalEarning = baseAmount + bonusAmount;

    try {
      // 1. Ledger missing technician earnings record
      const [earning] = await this.database
        .insert(technicianEarnings)
        .values({
          ticket_id: ticketId,
          technician_id: (violation.actionSequence?.steps.find((s) => s.actorRole === 'TECHNICIAN')?.actorId) || 'tech-autoheal',
          base_amount: baseAmount.toFixed(2),
          sla_bonus_amount: bonusAmount.toFixed(2),
          total_earning: totalEarning.toFixed(2),
          status: 'HELD',
          tenant_id: violation.tenantId,
        })
        .returning();

      // 2. Ledger missing Pre-Split OpEx entry
      await this.database.insert(expenses).values({
        tenant_id: violation.tenantId,
        category: OPEX_COMMISSION_CATEGORY,
        amount: totalEarning.toFixed(2),
        currency: 'USD',
        description: `[Auto-Heal BL-801] Labor commission for resolved ticket ${ticketId}`,
        incurred_at: new Date(),
      });

      logger.info(
        `[Sentinel Auto-Heal] Successfully ledged missing bounty ($${totalEarning.toFixed(2)}) for ticket '${ticketId}' (BL-801).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: ticketId,
        tenantId: violation.tenantId,
        success: true,
        actionTaken: 'LEDGER_MISSING_BOUNTY_AND_OPEX',
        details: {
          earningId: earning?.id,
          totalEarning,
          baseAmount,
          bonusAmount,
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.error(`[Sentinel Auto-Heal Error] Failed to ledger bounty for ticket '${ticketId}':`, err);
      return {
        ruleCode: this.ruleCode,
        entityId: ticketId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'FAILED_LEDGER',
        error: err.message,
        remediatedAt: new Date(),
      };
    }
  }
}
