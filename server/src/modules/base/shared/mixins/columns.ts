import { uuid, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';

/**
 * Reusable Drizzle column mixin for primary key UUID generation.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const baseColumns = {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
};

/**
 * Reusable Drizzle column mixin for standard ISO creation and update timestamps with timezone.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const timestampColumns = {
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
};

/**
 * Reusable Drizzle column mixin for tenant isolation foreign key.
 * Enforces PostgreSQL cascade delete and tenant bounding across all multitenant tables.
 *
 * @see ADR-017
 * @see ADR-018
 * @see BL-302
 */
export const tenantColumns = {
  tenant_id: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
};

/**
 * Reusable Drizzle column mixin for user auditing (author & modifier tracking).
 *
 * @see ADR-017
 * @see ADR-018
 */
export const auditColumns = {
  created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
};
