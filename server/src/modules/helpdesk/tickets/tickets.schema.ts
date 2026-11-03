import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  bigint,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  tenants,
  users,
  subscriptionEquipment,
} from '@shared/db/schema';

// ---- Ticket Enums ----
export const ticketStatusEnum = pgEnum('ticket_status', [
  'OPEN',
  'IN_PROGRESS',
  'AWAITING_PAYMENT',
  'RESOLVED',
  'RESOLVED_AUTOMATED',
  'CLOSED',
  'CANCELLED',
]);
export const ticketCategoryEnum = pgEnum('ticket_category', [
  'REPAIR',
  'WARRANTY',
  'SERVICE_OUTAGE',
  'PREVENTATIVE_MAINTENANCE',
  'HELPDESK',
  'AI',
]);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

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
    equipment_id: uuid('equipment_id').references(() => subscriptionEquipment.id, {
      onDelete: 'set null',
    }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    reporter_name: varchar('reporter_name', { length: 255 }),
    reporter_email: varchar('reporter_email', { length: 255 }),
    source: varchar('source', { length: 50 }).default('WEB').notNull(),
    device_snapshot: jsonb('device_snapshot'),
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
    index('idx_tickets_equipment').on(table.equipment_id),
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
    author_name: varchar('author_name', { length: 255 }),
    is_internal: boolean('is_internal').notNull().default(false),
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
