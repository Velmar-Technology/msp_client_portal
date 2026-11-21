import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';

// ---- User Nav Views (seen markers for sidebar counters) ----
export const userNavViews = pgTable(
  'user_nav_views',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    nav_key: varchar('nav_key', { length: 64 }).notNull(),
    last_seen_at: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_nav_views_user').on(table.user_id),
    index('idx_nav_views_tenant').on(table.tenant_id),
  ]
);

export type UserNavView = typeof userNavViews.$inferSelect;
export type NewUserNavView = typeof userNavViews.$inferInsert;
