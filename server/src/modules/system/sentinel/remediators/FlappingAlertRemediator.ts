import { db, rmmAlerts, ticketEvents, users } from '@shared/db';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';
import { FLAPPING_TAG } from '../checkers/ticketing/AlertNoiseFlappingChecker';

/**
 * Autonomous Self-Healing Remediator for BL-103: Alert Noise, Auto-Remediation & Flapping Rule.
 * When a device triggers >= 3 alert instances within 24h without the flapping tag,
 * this remediator prefixes the alert title with `[FLAPPING_ALERT]`, tags ticket notes,
 * and routes to Tier 2 support.
 *
 * @see BL-103
 */
export class FlappingAlertRemediator implements RemediationHandler {
  readonly ruleCode = 'BL-103';
  readonly name = 'Flapping Alert Remediator';

  /**
   * Initializes remediator with optional database client injection for unit tests.
   *
   * @param database - Drizzle DB instance
   */
  constructor(private readonly database: typeof db = db) {}

  /**
   * Executes autonomous remediation for flapping alerts.
   *
   * @param violation - BL-103 invariant breach
   * @returns RemediationResult
   */
  async remediate(violation: InvariantViolation): Promise<RemediationResult> {
    const alertId = violation.evidence?.alertId as string;
    const deviceId = (violation.evidence?.deviceId as string) || violation.entityId;

    try {
      // 1. If alert record exists, update alert_type / title in database
      if (alertId) {
        const [existing] = await this.database
          .select()
          .from(rmmAlerts)
          .where(eq(rmmAlerts.id, alertId))
          .limit(1);

        if (existing) {
          const currentType = existing.alert_type;
          const updatedType = currentType.includes(FLAPPING_TAG)
            ? currentType
            : `${FLAPPING_TAG} ${currentType}`;

          await this.database
            .update(rmmAlerts)
            .set({
              alert_type: updatedType,
            })
            .where(eq(rmmAlerts.id, alertId));

          // If linked to a ticket, record an escalation event to Tier 2
          if (existing.ticket_id) {
            const [adminUser] = await this.database
              .select({ id: users.id })
              .from(users)
              .where(eq(users.role, 'ADMIN'))
              .limit(1);

            await this.database.insert(ticketEvents).values({
              ticket_id: existing.ticket_id,
              old_status: 'OPEN',
              new_status: 'OPEN',
              changed_by: adminUser?.id,
              notes: `[Auto-Heal BL-103] Device '${deviceId}' flapping detected (>=3 triggers in 24h). Tagged with ${FLAPPING_TAG} and routed to Tier 2.`,
              tenant_id: violation.tenantId,
            });
          }
        }
      }

      logger.info(
        `[Sentinel Auto-Heal] Successfully tagged flapping alert for device '${deviceId}' with '${FLAPPING_TAG}' and routed to Tier 2 (BL-103).`
      );

      return {
        ruleCode: this.ruleCode,
        entityId: deviceId,
        tenantId: violation.tenantId,
        success: true,
        actionTaken: 'TAG_FLAPPING_ALERT_AND_ROUTE_TIER_2',
        details: {
          deviceId,
          alertId,
          flappingTag: FLAPPING_TAG,
          targetQueue: 'TIER_2',
        },
        remediatedAt: new Date(),
      };
    } catch (err: any) {
      logger.error(`[Sentinel Auto-Heal Error] Failed to remediate flapping alert for '${deviceId}':`, err);
      return {
        ruleCode: this.ruleCode,
        entityId: deviceId,
        tenantId: violation.tenantId,
        success: false,
        actionTaken: 'FAILED_FLAPPING_REMEDIATION',
        error: err.message,
        remediatedAt: new Date(),
      };
    }
  }
}
