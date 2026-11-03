import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from '@shared/db/schema';

export const kbTable = pgTable(
  'helpdesk_kb',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_helpdesk_kb_tenant').on(table.tenant_id),
    index('idx_helpdesk_kb_status').on(table.status),
  ]
);

export type KbEntity = typeof kbTable.$inferSelect;
export type NewKbEntity = typeof kbTable.$inferInsert;
