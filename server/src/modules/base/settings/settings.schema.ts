import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from '@shared/db/schema';

/**
 * Tenant Settings Drizzle ORM Schema (ADR-019 / Odoo-style ir.config_parameter).
 * Key-value configuration parameters per tenant with automatic cascade deletion.
 *
 * @see ADR-017
 * @see ADR-019
 * @see BL-302
 */
export const tenantSettings = pgTable(
  'tenant_settings',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').notNull(),
    module: varchar('module', { length: 100 }).default('core').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_tenant_settings_unique_key').on(table.tenant_id, table.key),
    index('idx_tenant_settings_tenant').on(table.tenant_id),
    index('idx_tenant_settings_module').on(table.module),
  ]
);

export type TenantSettingRow = typeof tenantSettings.$inferSelect;
export type InsertTenantSettingRow = typeof tenantSettings.$inferInsert;
