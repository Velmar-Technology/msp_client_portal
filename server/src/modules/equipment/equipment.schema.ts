import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';
import { subscriptions } from '@modules/subscriptions/subscriptions.schema';

// ---- Subscription Equipment (Device Slots) ----
export const subscriptionEquipment = pgTable(
  'subscription_equipment',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    subscription_id: uuid('subscription_id')
      .references(() => subscriptions.id, { onDelete: 'cascade' })
      .notNull(),
    slot_index: integer('slot_index').notNull(),
    status: varchar('status', { length: 50 }).default('PENDING_ACTIVATION').notNull(),
    device_name: varchar('device_name', { length: 255 }),
    device_serial: varchar('device_serial', { length: 255 }),
    agent_instance_id: uuid('agent_instance_id'),
    agent_hostname: varchar('agent_hostname', { length: 255 }),
    agent_serial: varchar('agent_serial', { length: 255 }),
    agent_last_seen_at: timestamp('agent_last_seen_at', { withTimezone: true }),
    agent_token: varchar('agent_token', { length: 255 }),
    otp: varchar('otp', { length: 10 }),
    otp_expires_at: timestamp('otp_expires_at', { withTimezone: true }),
    nextcloud_username: varchar('nextcloud_username', { length: 255 }),
    nextcloud_password: varchar('nextcloud_password', { length: 255 }),
    vaultwarden_org_id: uuid('vaultwarden_org_id'),
    vaultwarden_collection_id: varchar('vaultwarden_collection_id', { length: 255 }),
    vaultwarden_device_user_id: varchar('vaultwarden_device_user_id', { length: 255 }),
    vaultwarden_status: varchar('vaultwarden_status', { length: 50 }).default('UNPROVISIONED').notNull(),
    vaultwarden_last_synced_at: timestamp('vaultwarden_last_synced_at', { withTimezone: true }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_sub_equip_sub').on(table.subscription_id),
    index('idx_sub_equip_tenant').on(table.tenant_id),
    index('idx_sub_equip_otp').on(table.otp),
    index('idx_sub_equip_agent_token').on(table.agent_token),
  ]
);

export type SubscriptionEquipment = typeof subscriptionEquipment.$inferSelect;
export type NewSubscriptionEquipment = typeof subscriptionEquipment.$inferInsert;

// ---- Device Maintenances ----
export const deviceMaintenances = pgTable(
  'device_maintenances',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    equipment_id: uuid('equipment_id')
      .references(() => subscriptionEquipment.id, { onDelete: 'cascade' })
      .notNull(),
    subscription_id: uuid('subscription_id')
      .references(() => subscriptions.id, { onDelete: 'cascade' })
      .notNull(),
    client_id: uuid('client_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    assigned_tech_id: uuid('assigned_tech_id').references(() => users.id, { onDelete: 'set null' }),
    scheduled_date: timestamp('scheduled_date', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 50 }).default('SCHEDULED').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    notes: text('notes'),
    maintenance_type: varchar('maintenance_type', { length: 50 }).default('PREDEFINED_6M').notNull(),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_device_maint_equip').on(table.equipment_id),
    index('idx_device_maint_sub').on(table.subscription_id),
    index('idx_device_maint_client').on(table.client_id),
    index('idx_device_maint_tech').on(table.assigned_tech_id),
    index('idx_device_maint_tenant').on(table.tenant_id),
    index('idx_device_maint_date').on(table.scheduled_date),
    index('idx_device_maint_status').on(table.status),
  ]
);

export type DeviceMaintenance = typeof deviceMaintenances.$inferSelect;
export type NewDeviceMaintenance = typeof deviceMaintenances.$inferInsert;
