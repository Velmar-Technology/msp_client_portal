import { sql } from 'drizzle-orm';
import { db } from './index';

/**
 * Executes a database callback function wrapped inside a transaction that sets
 * PostgreSQL's `app.current_tenant_id` session variable. This guarantees that
 * Row-Level Security (RLS) policies filter queries exclusively to the specified tenant context.
 *
 * @typeParam T - Callback return value type
 * @param tenantId - Target tenant UUID
 * @param callback - Async function executing queries against the transactional database client
 * @returns Result of the transactional callback
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set local session variable scoped to this transaction block
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    return callback(tx as any);
  });
}
