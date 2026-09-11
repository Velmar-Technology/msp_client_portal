import { db, tenants } from '@shared/db';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';

/**
 * Autonomous Self-Healing Remediator for BL-702: 4-Tier Non-Payment Delinquency Scale.
 * Automatically enforces READ_ONLY restriction when a tenant has overdue unpaid invoices >= 5 days.
 *
 * @see BL-702
 */
export class NonPaymentEnforcementRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-702';
  readonly name = 'Non-Payment Delinquency Remediator';

  constructor(private readonly database: typeof db = db) {}

  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const tenantId = violation.tenantId;

    try {
      await this.database
        .update(tenants)
        .set({
          status: 'READ_ONLY',
          updated_at: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      logger.warn(
        `[Sentinel Auto-Heal] Placed delinquent tenant '${tenantId}' in READ_ONLY mode due to overdue invoices (BL-702).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: tenantId,
        tenantId,
        success: true,
        actionTaken: 'SET_READ_ONLY_MODE',
        details: {
          overdueDays: violation.evidence?.overdueDays,
          newStatus: 'READ_ONLY',
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.error(`[Sentinel Auto-Heal Error] Failed to enforce READ_ONLY on tenant '${tenantId}':`, err);
      return {
        ruleCode: this.ruleCode,
        entityId: tenantId,
        tenantId,
        success: false,
        actionTaken: 'FAILED_STATUS_UPDATE',
        error: err.message,
        remediatedAt: new Date(),
      };
    }
  }
}
