import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users, subscriptionEquipment } from '@shared/db/schema';

// ---- IT Assets ----
export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    asset_type: varchar('asset_type', { length: 50 }).default('HARDWARE').notNull(),
    status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
    model: varchar('model', { length: 255 }),
    serial_number: varchar('serial_number', { length: 255 }),
    manufacturer: varchar('manufacturer', { length: 255 }),
    assigned_client_id: uuid('assigned_client_id').references(() => users.id, { onDelete: 'set null' }),
    assigned_equipment_id: uuid('assigned_equipment_id').references(() => subscriptionEquipment.id, { onDelete: 'set null' }),
    purchase_date: timestamp('purchase_date', { withTimezone: true }),
    warranty_expires_at: timestamp('warranty_expires_at', { withTimezone: true }),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_assets_tenant').on(table.tenant_id),
    index('idx_assets_status').on(table.status),
    index('idx_assets_type').on(table.asset_type),
    index('idx_assets_client').on(table.assigned_client_id),
    index('idx_assets_equipment').on(table.assigned_equipment_id),
  ]
);

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

// ---- Re-export IT Consumables Schema (ADR-017) ----
export * from './consumables/consumables.schema';
