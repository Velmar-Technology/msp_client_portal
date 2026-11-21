import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from '@shared/db/schema';

// ---- Tenant BYOK Credentials ----
export const tenantByokCredentials = pgTable(
  'tenant_byok_credentials',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    provider: varchar('provider', { length: 32 }).default('openai').notNull(),
    model: varchar('model', { length: 128 }),
    base_url: varchar('base_url', { length: 255 }),
    encrypted_api_key: text('encrypted_api_key').notNull(),
    key_iv: varchar('key_iv', { length: 64 }).notNull(),
    key_auth_tag: varchar('key_auth_tag', { length: 64 }).notNull(),
    key_masked: varchar('key_masked', { length: 32 }).notNull(),
    is_valid: boolean('is_valid').default(true).notNull(),
    last_tested_at: timestamp('last_tested_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_byok_tenant').on(table.tenant_id),
    index('idx_byok_provider').on(table.provider),
  ]
);

export type TenantByokCredential = typeof tenantByokCredentials.$inferSelect;
export type NewTenantByokCredential = typeof tenantByokCredentials.$inferInsert;
