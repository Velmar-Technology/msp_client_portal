import { BaseRepository } from './BaseRepository';
import { RmmAlert } from '../types';
import { db, rmmAlerts } from '../db';
import { eq, and, gte, count } from 'drizzle-orm';

export class RmmAlertRepository extends BaseRepository<RmmAlert> {
  constructor() {
    super(rmmAlerts, 'rmm_alerts');
  }

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
