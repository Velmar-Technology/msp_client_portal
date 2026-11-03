import { BaseTenantRepository } from '@modules/base/shared/repositories/BaseTenantRepository';
import { tenantSettings, type TenantSettingRow } from '../settings.schema';
import { db } from '@shared/db';
import { eq, and, sql } from 'drizzle-orm';
import { isUuid } from '@shared/utils/validation';

/**
 * Repository managing tenant-scoped key-value configuration parameters (ADR-019).
 * Inherits tenant isolation lookups from `BaseTenantRepository`.
 *
 * @see ADR-018
 * @see ADR-019
 */
export class TenantSettingsRepository extends BaseTenantRepository<TenantSettingRow> {
  constructor() {
    super(tenantSettings, 'tenant_settings');
  }

  /**
   * Retrieves a single configuration parameter by tenant ID and parameter key.
   *
   * @param tenantId - Tenant UUID
   * @param key - Setting key identifier (e.g. 'helpdesk.auto_close_days')
   * @returns TenantSettingRow or null
   */
  async findByKey(tenantId: string, key: string): Promise<TenantSettingRow | null> {
    if (!tenantId || !isUuid(tenantId) || !key) {
      return null;
    }
    const result = await db
      .select()
      .from(tenantSettings)
      .where(and(eq(tenantSettings.tenant_id, tenantId), eq(tenantSettings.key, key)));

    return result[0] || null;
  }

  /**
   * Retrieves all configuration parameters for a tenant, optionally filtered by module.
   *
   * @param tenantId - Tenant UUID
   * @param module - Optional module namespace filter (e.g. 'helpdesk', 'billing')
   * @returns Array of matching configuration rows
   */
  async findAllByModule(tenantId: string, module?: string): Promise<TenantSettingRow[]> {
    if (!tenantId || !isUuid(tenantId)) {
      return [];
    }

    if (module) {
      return db
        .select()
        .from(tenantSettings)
        .where(and(eq(tenantSettings.tenant_id, tenantId), eq(tenantSettings.module, module)));
    }

    return db
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenant_id, tenantId));
  }

  /**
   * Upserts a setting parameter (insert or update on conflict on (tenant_id, key)).
   *
   * @param tenantId - Tenant UUID
   * @param key - Setting key identifier
   * @param value - Arbitrary JSON-serializable value
   * @param module - Module identifier (defaults to 'core')
   * @returns Persisted TenantSettingRow
   */
  async upsert(
    tenantId: string,
    key: string,
    value: unknown,
    module = 'core'
  ): Promise<TenantSettingRow> {
    const result = await db
      .insert(tenantSettings)
      .values({
        tenant_id: tenantId,
        key,
        value,
        module,
      })
      .onConflictDoUpdate({
        target: [tenantSettings.tenant_id, tenantSettings.key],
        set: {
          value,
          module,
          updated_at: sql`NOW()`,
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Deletes a configuration parameter by tenant ID and parameter key.
   *
   * @param tenantId - Tenant UUID
   * @param key - Setting key identifier
   * @returns True if deleted, false otherwise
   */
  async deleteByKey(tenantId: string, key: string): Promise<boolean> {
    if (!tenantId || !isUuid(tenantId) || !key) {
      return false;
    }
    const result = await db
      .delete(tenantSettings)
      .where(and(eq(tenantSettings.tenant_id, tenantId), eq(tenantSettings.key, key)));

    return (result.rowCount ?? 0) > 0;
  }
}

export const tenantSettingsRepository = new TenantSettingsRepository();
