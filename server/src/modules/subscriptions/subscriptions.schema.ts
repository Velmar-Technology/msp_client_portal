import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';

// ---- Subscription Enums ----
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'ACTIVE',
  'EXPIRING',
  'EXPIRED',
  'CANCELLED',
]);

// ---- Plans ----
export const plans = pgTable('plans', {
  id: varchar('id', { length: 50 }).primaryKey(),
  name: jsonb('name').notNull(),
  description: jsonb('description'),
  price: integer('price').notNull(),
  features: jsonb('features').notNull(),
  recommended: boolean('recommended').default(false).notNull(),
  client_type: varchar('client_type', { length: 50 }).default('CLIENT').notNull(),
  active: boolean('active').default(true).notNull(),
  is_custom: boolean('is_custom').default(false).notNull(),
  tenant_id: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  lead_id: uuid('lead_id'),
  target_client_id: uuid('target_client_id').references(() => users.id, { onDelete: 'set null' }),
  per_device_price: integer('per_device_price').default(0),
  ticket_quota: integer('ticket_quota'),
  sla_tier: jsonb('sla_tier'),
  tax_exempt: boolean('tax_exempt').default(false).notNull(),
  paypal_plan_id_monthly: varchar('paypal_plan_id_monthly', { length: 255 }),
  paypal_plan_id_annual: varchar('paypal_plan_id_annual', { length: 255 }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;

// ---- Subscriptions ----
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    client_id: uuid('client_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    service_name: varchar('service_name', { length: 255 }).notNull(),
    plan: varchar('plan', { length: 50 })
      .references(() => plans.id, { onUpdate: 'cascade' })
      .notNull(),
    status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
    renewal_date: timestamp('renewal_date', { withTimezone: true }).notNull(),
    equipment_count: integer('equipment_count').default(1).notNull(),
    paypal_order_id: varchar('paypal_order_id', { length: 255 }).unique(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    last_warning_sent_at: timestamp('last_warning_sent_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_subscriptions_client').on(table.client_id),
    index('idx_subscriptions_status').on(table.status),
    index('idx_subscriptions_tenant').on(table.tenant_id),
    index('idx_subscriptions_paypal_order').on(table.paypal_order_id),
  ]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
