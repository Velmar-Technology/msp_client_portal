import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---- Core Enums ----
export const userRoleEnum = pgEnum('user_role', ['CLIENT', 'TECHNICIAN', 'ADMIN', 'GUEST']);
export const accountStatusEnum = pgEnum('account_status', ['ACTIVE', 'READ_ONLY', 'SUSPENDED', 'PURGED']);

// ---- Tenants ----
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).unique(),
  rnc: varchar('rnc', { length: 50 }),
  account_status: accountStatusEnum('account_status').default('ACTIVE').notNull(),
  read_only_at: timestamp('read_only_at', { withTimezone: true }),
  suspended_at: timestamp('suspended_at', { withTimezone: true }),
  purged_at: timestamp('purged_at', { withTimezone: true }),
  vault_grace_extension_until: timestamp('vault_grace_extension_until', { withTimezone: true }),
  vault_grace_extensions_count: integer('vault_grace_extensions_count').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

// ---- Users ----
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    password_hash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('CLIENT').notNull(),
    specialty: varchar('specialty', { length: 100 }),
    is_active: boolean('is_active').default(true),
    account_status: accountStatusEnum('account_status').default('ACTIVE').notNull(),
    rnc: varchar('rnc', { length: 50 }),
    email_verified: boolean('email_verified').default(false),
    otp_code: varchar('otp_code', { length: 10 }),
    otp_expires: timestamp('otp_expires', { withTimezone: true }),
    language: varchar('language', { length: 10 }).default('en_US'),
    avatar_url: varchar('avatar_url', { length: 1000 }),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    last_login_ip: varchar('last_login_ip', { length: 45 }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    client_type: varchar('client_type', { length: 50 }).default('CLIENT').notNull(),
    phone_number: varchar('phone_number', { length: 50 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_role').on(table.role),
    index('idx_users_tenant').on(table.tenant_id),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---- Round Robin State ----
export const roundRobinState = pgTable('round_robin_state', {
  category: varchar('category', { length: 50 }).primaryKey(),
  last_assigned_tech_id: uuid('last_assigned_tech_id').references(() => users.id),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type RoundRobinState = typeof roundRobinState.$inferSelect;
export type NewRoundRobinState = typeof roundRobinState.$inferInsert;

// ============================================================================
// DOMAIN MODULE SCHEMA RE-EXPORTS (Zero-Touch ADR-017 Deep Extraction)
// ============================================================================
export * from '@modules/subscriptions/subscriptions.schema';
export * from '@modules/equipment/equipment.schema';
export * from '@modules/billing/billing.schema';
export * from '@modules/crm/crm.schema';
export * from '@modules/rmm/rmm.schema';
export * from '@modules/notifications/notifications.schema';
export * from '@modules/nav/nav.schema';
export * from '@modules/auth/auth.schema';
export * from '@modules/system/system.schema';
export * from '@modules/assets/assets.schema';
export * from '@modules/assets/consumables/consumables.schema';
export * from '@modules/helpdesk/tickets/tickets.schema';
export * from '@modules/helpdesk/kb/kb.schema';
