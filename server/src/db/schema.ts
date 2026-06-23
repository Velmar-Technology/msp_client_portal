import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  date,
  timestamp,
  pgEnum,
  bigint,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---- Enum Types ----
export const userRoleEnum = pgEnum('user_role', ['CLIENT', 'TECHNICIAN', 'ADMIN']);
export const ticketStatusEnum = pgEnum('ticket_status', [
  'OPEN',
  'IN_PROGRESS',
  'AWAITING_PAYMENT',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]);
export const ticketCategoryEnum = pgEnum('ticket_category', ['REPAIR', 'WARRANTY', 'SERVICE_OUTAGE']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['BASIC', 'STANDARD', 'PREMIUM']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['PENDING', 'PAID', 'OVERDUE']);

// ---- Tenants ----
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).unique(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

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
    email_verified: boolean('email_verified').default(false),
    language: varchar('language', { length: 10 }).default('en_US'),
    avatar_url: varchar('avatar_url', { length: 1000 }),
    last_login_at: timestamp('last_login_at', { withTimezone: true }),
    last_login_ip: varchar('last_login_ip', { length: 45 }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    client_type: varchar('client_type', { length: 50 }).default('CLIENT').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_role').on(table.role),
    index('idx_users_tenant').on(table.tenant_id),
  ]
);

// ---- Tickets ----
export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').notNull(),
    category: ticketCategoryEnum('category').notNull(),
    status: ticketStatusEnum('status').default('OPEN').notNull(),
    priority: ticketPriorityEnum('priority').default('MEDIUM').notNull(),
    client_id: uuid('client_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    assigned_tech_id: uuid('assigned_tech_id').references(() => users.id, { onDelete: 'set null' }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_tickets_client').on(table.client_id),
    index('idx_tickets_tech').on(table.assigned_tech_id),
    index('idx_tickets_status').on(table.status),
    index('idx_tickets_category').on(table.category),
    index('idx_tickets_created').on(table.created_at),
    index('idx_tickets_tenant').on(table.tenant_id),
  ]
);

// ---- Ticket Attachments ----
export const ticketAttachments = pgTable(
  'ticket_attachments',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    ticket_id: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    response_id: uuid('response_id').references(() => ticketResponses.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 500 }).notNull(),
    path: varchar('path', { length: 1000 }).notNull(),
    mime_type: varchar('mime_type', { length: 100 }).notNull(),
    size_bytes: bigint('size_bytes', { mode: 'number' }).default(0).notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    uploaded_at: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_attachments_ticket').on(table.ticket_id),
    index('idx_attachments_tenant').on(table.tenant_id),
    index('idx_attachments_response').on(table.response_id),
  ]
);

// ---- Ticket Events ----
export const ticketEvents = pgTable(
  'ticket_events',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    ticket_id: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    old_status: ticketStatusEnum('old_status'),
    new_status: ticketStatusEnum('new_status').notNull(),
    changed_by: uuid('changed_by')
      .references(() => users.id)
      .notNull(),
    notes: text('notes'),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_events_ticket').on(table.ticket_id),
    index('idx_events_created').on(table.created_at),
    index('idx_events_tenant').on(table.tenant_id),
  ]
);

// ---- Ticket Responses ----
export const ticketResponses = pgTable(
  'ticket_responses',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    ticket_id: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    message: text('message').notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_responses_ticket').on(table.ticket_id),
    index('idx_responses_user').on(table.user_id),
    index('idx_responses_tenant').on(table.tenant_id),
  ]
);


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
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ---- Subscriptions ----
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    client_id: uuid('client_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    service_name: varchar('service_name', { length: 255 }).notNull(),
    plan: varchar('plan', { length: 50 }).default('PL-001').notNull(),
    status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
    renewal_date: timestamp('renewal_date', { withTimezone: true }).notNull(),
    equipment_count: integer('equipment_count').default(1).notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_subscriptions_client').on(table.client_id),
    index('idx_subscriptions_status').on(table.status),
    index('idx_subscriptions_tenant').on(table.tenant_id),
  ]
);

// ---- Invoices ----
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    invoice_number: varchar('invoice_number', { length: 50 }).unique().notNull(),
    client_id: uuid('client_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).$type<number>().notNull(),
    tax_amount: decimal('tax_amount', { precision: 12, scale: 2 }).$type<number>().default(0).notNull(),
    total: decimal('total', { precision: 12, scale: 2 }).$type<number>().notNull(),
    status: invoiceStatusEnum('status').default('PENDING').notNull(),
    invoice_date: date('invoice_date', { mode: 'date' }).defaultNow().notNull(),
    due_date: date('due_date', { mode: 'date' }).notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_invoices_client').on(table.client_id),
    index('idx_invoices_status').on(table.status),
    index('idx_invoices_number').on(table.invoice_number),
    index('idx_invoices_tenant').on(table.tenant_id),
  ]
);

// ---- Round Robin State ----
export const roundRobinState = pgTable('round_robin_state', {
  category: varchar('category', { length: 50 }).primaryKey(),
  last_assigned_tech_id: uuid('last_assigned_tech_id').references(() => users.id),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ---- Notifications ----
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    link: varchar('link', { length: 500 }),
    ticket_id: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    read: boolean('read').default(false).notNull(),
    metadata: jsonb('metadata'),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_notifications_user').on(table.user_id),
    index('idx_notifications_tenant').on(table.tenant_id),
    index('idx_notifications_read').on(table.read),
    index('idx_notifications_created').on(table.created_at),
  ]
);

// ---- Notification Preferences ----
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    preferences: jsonb('preferences').notNull().default(sql`'{
      "TICKET_CREATED":        { "in_app": true, "email": true, "whatsapp": false },
      "TICKET_ASSIGNED":       { "in_app": true, "email": true, "whatsapp": false },
      "TICKET_STATUS_CHANGED": { "in_app": true, "email": true, "whatsapp": true },
      "TICKET_CANCELLED":      { "in_app": true, "email": true, "whatsapp": false },
      "NEW_REPLY":             { "in_app": true, "email": true, "whatsapp": false }
    }'::jsonb`),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_notif_prefs_user').on(table.user_id),
    index('idx_notif_prefs_tenant').on(table.tenant_id),
  ]
);

