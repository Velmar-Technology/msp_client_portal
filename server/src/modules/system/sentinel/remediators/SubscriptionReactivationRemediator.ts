import { db, subscriptions } from '@shared/db';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';

/**
 * Autonomous Self-Healing Remediator for BL-401: Subscription Reactivation on Payment.
 * When an invoice has been paid but the subscription remained in EXPIRED or SUSPENDED state
 * (e.g. dropped webhook), this remediator reactivates the subscription to 'ACTIVE'.
 *
 * @see BL-401
 */
export class SubscriptionReactivationRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-401';
  readonly name = 'Subscription Reactivation Remediator';

  /**
   * Initializes remediator with optional database client injection for unit tests.
   */
  constructor(private readonly database: typeof db = db) {}

  /**
   * Executes autonomous reactivation of the expired subscription linked to the paid invoice.
   *
   * @param violation - BL-401 invariant violation
   * @returns RemediationResult
   */
  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const subId = (violation.evidence?.subscriptionId as string) || '';

    if (!subId) {
      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'NO_ACTION',
        error: 'Missing subscription ID in violation evidence',
        remediatedAt: new Date(),
      };
    }

    try {
      await this.database
        .update(subscriptions)
        .set({
          status: 'ACTIVE',
          updated_at: new Date(),
        })
        .where(eq(subscriptions.id, subId));

      logger.info(
        `[Sentinel Auto-Heal] Successfully reactivated expired subscription '${subId}' for tenant '${violation.tenantId}' (BL-401).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: true,
        actionTaken: 'REACTIVATE_SUBSCRIPTION',
        details: {
          subscriptionId: subId,
          previousStatus: violation.evidence?.subscriptionStatus,
          newStatus: 'ACTIVE',
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.error(`[Sentinel Auto-Heal Error] Failed to reactivate subscription '${subId}':`, err);
      return {
        ruleCode: this.ruleCode,
        entityId: violation.entityId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'FAILED_UPDATE',
        error: err.message,
        remediatedAt: new Date(),
      };
    }
  }
}
