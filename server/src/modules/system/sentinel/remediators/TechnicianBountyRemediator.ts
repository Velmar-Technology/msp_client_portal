import { db, technicianEarnings, expenses, users, tickets } from '@shared/db';
import { eq, or } from 'drizzle-orm';
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
      // 1. Resolve valid technician user UUID
      const rootTicket = violation.actionSequence?.rootContext?.ticket as any;
      let technicianId = rootTicket?.assigned_tech_id;
      if (!technicianId) {
        technicianId = violation.actionSequence?.steps.find((s) => s.actorRole === 'TECHNICIAN')?.actorId;
      }
      if (!technicianId) {
        const [dbTicket] = await this.database
          .select({ assigned_tech_id: tickets.assigned_tech_id })
          .from(tickets)
          .where(eq(tickets.id, ticketId))
          .limit(1);
        technicianId = dbTicket?.assigned_tech_id;
      }
      if (!technicianId) {
        const [techUser] = await this.database
          .select({ id: users.id })
          .from(users)
          .where(or(eq(users.role, 'TECHNICIAN'), eq(users.role, 'ADMIN')))
          .limit(1);
        technicianId = techUser?.id;
      }

      if (!technicianId) {
        throw new Error(`Unable to resolve technician user for ticket '${ticketId}'`);
      }

      // 2. Ledger missing Pre-Split OpEx entry
      const [createdExpense] = await this.database
        .insert(expenses)
        .values({
          tenant_id: violation.tenantId,
          category: OPEX_COMMISSION_CATEGORY,
          amount: Number(totalEarning.toFixed(2)),
          description: `[Auto-Heal BL-801] Labor commission for resolved ticket ${ticketId}`,
          expense_date: new Date(),
          expense_identifier: `EARN-${ticketId.substring(0, 8)}`,
        })
        .returning();

      // 3. Ledger missing technician earnings record
      const [earning] = await this.database
        .insert(technicianEarnings)
        .values({
          ticket_id: ticketId,
          technician_id: technicianId,
          base_amount: Number(baseAmount.toFixed(2)),
          sla_bonus_amount: Number(bonusAmount.toFixed(2)),
          final_amount: Number(totalEarning.toFixed(2)),
          currency: 'USD',
          status: 'PENDING',
          breakdown: {
            priority,
            baseRate: BASE_COMMISSION_RATE,
            multiplier,
            slaBonus: bonusAmount,
            autoHealed: true,
          },
          expense_id: createdExpense?.id || null,
          tenant_id: violation.tenantId,
        })
        .returning();

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
