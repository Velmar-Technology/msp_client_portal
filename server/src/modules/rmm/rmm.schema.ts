import {
  pgTable,
  uuid,
  varchar,
  integer,
  decimal,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from '@shared/db/schema';
import { tickets } from '@modules/helpdesk/tickets/tickets.schema';
import { subscriptionEquipment } from '@modules/equipment/equipment.schema';

// ---- RMM Alerts ----
export const rmmAlerts = pgTable(
  'rmm_alerts',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    alert_type: varchar('alert_type', { length: 255 }).notNull(),
    asset_id: varchar('asset_id', { length: 255 }).notNull(),
    received_at: timestamp('received_at', { withTimezone: true }).notNull(),
    ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'set null' }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_rmm_alerts_lookup').on(table.alert_type, table.asset_id, table.received_at),
    index('idx_rmm_alerts_tenant').on(table.tenant_id),
  ]
);

export type RmmAlert = typeof rmmAlerts.$inferSelect;
export type NewRmmAlert = typeof rmmAlerts.$inferInsert;

// ---- RMM Patches ----
export const rmmPatches = pgTable(
  'rmm_patches',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    equipment_id: uuid('equipment_id')
      .references(() => subscriptionEquipment.id, { onDelete: 'cascade' })
      .notNull(),
    patch_id: varchar('patch_id', { length: 100 }).notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    severity: varchar('severity', { length: 50 }).default('MEDIUM').notNull(),
    status: varchar('status', { length: 50 }).default('PENDING').notNull(),
    release_date: timestamp('release_date', { withTimezone: true }),
    installed_at: timestamp('installed_at', { withTimezone: true }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_rmm_patches_equip').on(table.equipment_id),
    index('idx_rmm_patches_tenant').on(table.tenant_id),
    index('idx_rmm_patches_status').on(table.status),
  ]
);

export type RmmPatch = typeof rmmPatches.$inferSelect;
export type NewRmmPatch = typeof rmmPatches.$inferInsert;

// ---- RMM Device Telemetry ----
export const rmmDeviceTelemetry = pgTable(
  'rmm_device_telemetry',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    equipment_id: uuid('equipment_id')
      .references(() => subscriptionEquipment.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    zabbix_host_id: varchar('zabbix_host_id', { length: 100 }),
    agent_status: varchar('agent_status', { length: 50 }).default('ONLINE').notNull(),
    cpu_usage: decimal('cpu_usage', { precision: 5, scale: 2 }).$type<number>().default(0),
    memory_usage: decimal('memory_usage', { precision: 5, scale: 2 }).$type<number>().default(0),
    disk_usage: decimal('disk_usage', { precision: 5, scale: 2 }).$type<number>().default(0),
    disk_used_gb: decimal('disk_used_gb', { precision: 10, scale: 2 }).$type<number>().default(0),
    disk_total_gb: decimal('disk_total_gb', { precision: 10, scale: 2 }).$type<number>().default(0),
    pending_patch_count: integer('pending_patch_count').default(0).notNull(),
    last_sync_at: timestamp('last_sync_at', { withTimezone: true }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_rmm_telemetry_equip').on(table.equipment_id),
    index('idx_rmm_telemetry_tenant').on(table.tenant_id),
    index('idx_rmm_telemetry_status_sync').on(table.agent_status, table.last_sync_at),
  ]
);

export type RmmDeviceTelemetry = typeof rmmDeviceTelemetry.$inferSelect;
export type NewRmmDeviceTelemetry = typeof rmmDeviceTelemetry.$inferInsert;
