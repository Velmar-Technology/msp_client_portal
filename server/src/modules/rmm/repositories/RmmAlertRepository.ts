import { BaseRepository } from '@shared/repositories/BaseRepository';
import { RmmAlert } from '@shared/types';
import { db, rmmAlerts } from '@shared/db';
import { eq, and, gte, count } from 'drizzle-orm';

/**
 * Data repository for RMM alert logs supporting window deduplication and flapping frequency analysis.
 *
 * @see BL-103 (Alert Noise & Auto-Remediation)
 */
export class RmmAlertRepository extends BaseRepository<RmmAlert> {
  /**
   * Initializes RmmAlertRepository for the rmm_alerts database table.
   */
  constructor() {
    super(rmmAlerts, 'rmm_alerts');
  }

  /**
   * Counts the number of alerts received for a specific alert type and asset within a given time window (BL-103).
   *
   * @param alertType - Alert signature / type string
   * @param assetId - Target asset / hostname
   * @param since - Starting timestamp threshold
   * @returns Count of matching alerts
   * @see BL-103
   */
  async countInWindow(alertType: string, assetId: string, since: Date): Promise<number> {
    const result = await db
      .select({ val: count() })
      .from(rmmAlerts)
      .where(
        and(
          eq(rmmAlerts.alert_type, alertType),
          eq(rmmAlerts.asset_id, assetId),
          gte(rmmAlerts.received_at, since)
        )
      );
    return result[0]?.val ?? 0;
  }

  /**
   * Inserts an RMM alert audit record.
   *
   * @param data - Alert properties
   * @returns Created RmmAlert entity
   */
  async create(data: {
    alertType: string;
    assetId: string;
    tenantId: string;
    ticket_id?: string | null;
  }): Promise<RmmAlert> {
    const results = await db
      .insert(rmmAlerts)
      .values({
        alert_type: data.alertType,
        asset_id: data.assetId,
        received_at: new Date(),
        ticket_id: data.ticket_id || null,
        tenant_id: data.tenantId,
      })
      .returning();
    return results[0] as RmmAlert;
  }
}

export const rmmAlertRepository = new RmmAlertRepository();
