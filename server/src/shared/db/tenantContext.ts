import { AsyncLocalStorage } from 'node:async_hooks';
import { sql } from 'drizzle-orm';
import { db } from './index';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  role?: string;
  isSystemAdmin?: boolean;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Returns the currently active tenant context from AsyncLocalStorage.
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Returns the active tenant ID, or undefined if no tenant context is bound.
 */
export function getCurrentTenantId(): string | undefined {
  return tenantContextStorage.getStore()?.tenantId;
}

/**
 * Runs a callback within the given tenant context.
 */
export function runInTenantContext<R>(context: TenantContext, fn: () => R): R {
  return tenantContextStorage.run(context, fn);
}

/**
 * Executes a database callback function wrapped inside a transaction that sets
 * PostgreSQL's `app.current_tenant_id` session variable. This guarantees that
 * Row-Level Security (RLS) policies filter queries exclusively to the specified tenant context.
 *
 * @typeParam T - Callback return value type
 * @param tenantId - Target tenant UUID
 * @param callback - Async function executing queries against the transactional database client
 * @param isSystemAdmin - Whether to grant system administrative RLS bypass
 * @returns Result of the transactional callback
 */
export async function withTenantContext<T>(
  tenantId: string,
  callback: (tx: typeof db) => Promise<T>,
  isSystemAdmin = false
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set local session variable scoped to this transaction block
    await tx.execute(
      sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    );
    if (isSystemAdmin) {
      await tx.execute(
        sql`SELECT set_config('app.is_system_admin', 'true', true)`
      );
    }
    return tenantContextStorage.run(
      { tenantId, isSystemAdmin },
      () => callback(tx as any)
    );
  });
}
