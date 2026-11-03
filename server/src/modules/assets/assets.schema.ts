import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users, subscriptionEquipment, tickets } from '@shared/db/schema';

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

// ---- IT Consumables ----
export const consumables = pgTable(
  'consumables',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    model_number: varchar('model_number', { length: 100 }),
    item_number: varchar('item_number', { length: 100 }),
    manufacturer: varchar('manufacturer', { length: 100 }),
    total_quantity: integer('total_quantity').default(0).notNull(),
    min_quantity: integer('min_quantity').default(5).notNull(),
    location: varchar('location', { length: 255 }),
    purchase_cost: decimal('purchase_cost', { precision: 10, scale: 2 }).$type<number>(),
    alert_state: varchar('alert_state', { length: 50 }).default('NORMAL').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_consumables_tenant').on(table.tenant_id),
    index('idx_consumables_category').on(table.category),
    index('idx_consumables_alert').on(table.alert_state),
  ]
);

export type Consumable = typeof consumables.$inferSelect;
export type NewConsumable = typeof consumables.$inferInsert;

// ---- Consumable Checkouts Ledger ----
export const consumableCheckouts = pgTable(
  'consumable_checkouts',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    consumable_id: uuid('consumable_id')
      .references(() => consumables.id, { onDelete: 'cascade' })
      .notNull(),
    quantity: integer('quantity').notNull(),
    assigned_user_id: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    assigned_equipment_id: uuid('assigned_equipment_id').references(() => subscriptionEquipment.id, { onDelete: 'set null' }),
    ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
    dispensed_by_id: uuid('dispensed_by_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_consumable_checkouts_tenant').on(table.tenant_id),
    index('idx_consumable_checkouts_item').on(table.consumable_id),
    index('idx_consumable_checkouts_user').on(table.assigned_user_id),
  ]
);

export type ConsumableCheckout = typeof consumableCheckouts.$inferSelect;
export type NewConsumableCheckout = typeof consumableCheckouts.$inferInsert;
