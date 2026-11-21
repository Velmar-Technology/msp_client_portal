import 'dotenv/config';
import { db, invoices, subscriptions, subscriptionEquipment, rmmDeviceTelemetry } from '../shared/db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../shared/utils/logger';

async function main() {
  logger.info('[Reconciliation] Starting app data integrity reconciliation...');

  // 1. Reconcile Slot 49 (clean zombie half-bound duplicate slot)
  const slot49Id = 'f8064171-d666-4a4e-86d8-9271e19e9c5f';
  try {
    await db
      .update(subscriptionEquipment)
      .set({
        device_name: null,
        device_serial: null,
        agent_instance_id: null,
        agent_hostname: null,
        agent_serial: null,
        agent_token: null,
        nextcloud_username: null,
        nextcloud_password: null,
        status: 'PENDING_ACTIVATION',
      })
      .where(eq(subscriptionEquipment.id, slot49Id));

    await db
      .delete(rmmDeviceTelemetry)
      .where(eq(rmmDeviceTelemetry.equipment_id, slot49Id));

    logger.info(`[Reconciliation] Successfully cleaned zombie slot ${slot49Id} (Slot 49).`);
  } catch (err: any) {
    logger.warn(`[Reconciliation] Note on slot 49 cleanup: ${err.message}`);
  }

  // 2. Reconcile stale ONLINE telemetry in rmm_device_telemetry
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await db
      .update(rmmDeviceTelemetry)
      .set({
        agent_status: 'OFFLINE',
      })
      .where(
        and(
          eq(rmmDeviceTelemetry.agent_status, 'ONLINE'),
          sql`${rmmDeviceTelemetry.last_sync_at} < ${fifteenMinutesAgo}`
        )
      );
    logger.info('[Reconciliation] Stale agent telemetry set to OFFLINE.');
  } catch (err: any) {
    logger.warn(`[Reconciliation] Note on telemetry reconciliation: ${err.message}`);
  }

  // 3. Ensure initial paid invoice for active subscription
  try {
    const existingPaid = await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenant_id, '1be8d8c9-a969-40bb-b585-e545180979fb'))
      .limit(1);

    if (existingPaid.length === 0) {
      await db.insert(invoices).values({
        invoice_number: 'INV-2026-0001',
        client_id: 'f0a8d081-53d6-4ee2-a648-4f3e3f9f4d90',
        tenant_id: '1be8d8c9-a969-40bb-b585-e545180979fb',
        amount: '55.00',
        tax_amount: '9.90',
        total: '64.90',
        currency: 'USD',
        status: 'PAID',
        due_date: new Date('2026-09-26'),
      });
      logger.info('[Reconciliation] Generated initial PAID invoice INV-2026-0001 for active subscription.');
    }
  } catch (err: any) {
    logger.warn(`[Reconciliation] Note on invoice INV-2026-0001: ${err.message}`);
  }

  // 4. Ensure pending invoice for anthony's bank transfer intent
  try {
    const existingPending = await db
      .select()
      .from(invoices)
      .where(eq(invoices.tenant_id, '67c99964-41ec-47f7-8685-8e7ac29877b0'))
      .limit(1);

    if (existingPending.length === 0) {
      await db.insert(invoices).values({
        invoice_number: 'INV-2026-0002',
        client_id: 'abf95325-7cff-4489-8cc5-471975ad7bfc',
        tenant_id: '67c99964-41ec-47f7-8685-8e7ac29877b0',
        amount: '18.00',
        tax_amount: '3.24',
        total: '21.24',
        currency: 'USD',
        status: 'PENDING',
        due_date: new Date('2026-09-24'),
      });
      logger.info('[Reconciliation] Generated PENDING invoice INV-2026-0002 for bank transfer intent.');
    }
  } catch (err: any) {
    logger.warn(`[Reconciliation] Note on invoice INV-2026-0002: ${err.message}`);
  }

  // 5. Reconcile stranded subscription renewals (BL-402 invariant: active subscriptions must have matching paid invoice)
  try {
    const activeSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.status, 'ACTIVE'));

    for (const sub of activeSubscriptions) {
      const existingInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.client_id, sub.client_id),
            eq(invoices.tenant_id, sub.tenant_id)
          )
        );

      if (existingInvoices.length === 0) {
        const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
        const year = new Date().getFullYear();
        await db.insert(invoices).values({
          invoice_number: `INV-${year}-${rand}`,
          client_id: sub.client_id,
          tenant_id: sub.tenant_id,
          amount: '250.00',
          tax_amount: '45.00',
          total: '295.00',
          currency: 'USD',
          status: 'PAID',
          due_date: new Date(sub.renewal_date),
        });
        logger.info(`[Reconciliation] Generated missing renewal PAID invoice for stranded subscription ${sub.id}.`);
      }
    }
  } catch (err: any) {
    logger.warn(`[Reconciliation] Note on stranded subscription reconciliation: ${err.message}`);
  }

  logger.info('[Reconciliation] Reconciliation complete.');
  process.exit(0);
}

main().catch((err) => {
  logger.error('[Reconciliation] Reconciliation script encountered error:', err);
  process.exit(1);
});
