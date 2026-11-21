import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  date,
  timestamp,
  pgEnum,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';
import { tickets } from '@modules/helpdesk/tickets/tickets.schema';

// ---- Billing Enums ----
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);

export const earningStatusEnum = pgEnum('earning_status', [
  'PENDING',
  'APPROVED',
  'PAID',
  'VOIDED',
]);

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
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    ncf: varchar('ncf', { length: 50 }),
    rnc: varchar('rnc', { length: 50 }),
    status: invoiceStatusEnum('status').default('PENDING').notNull(),
    invoice_date: date('invoice_date', { mode: 'date' }).defaultNow().notNull(),
    due_date: date('due_date', { mode: 'date' }).notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    last_email_sent_at: timestamp('last_email_sent_at', { withTimezone: true }),
    line_items: jsonb('line_items'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_invoices_client').on(table.client_id),
    index('idx_invoices_status').on(table.status),
    index('idx_invoices_number').on(table.invoice_number),
    index('idx_invoices_tenant').on(table.tenant_id),
  ]
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// ---- Expenses ----
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    amount: decimal('amount', { precision: 12, scale: 2 }).$type<number>().notNull(),
    description: text('description').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    expense_date: date('expense_date', { mode: 'date' }).defaultNow().notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    expense_identifier: varchar('expense_identifier', { length: 100 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_expenses_tenant').on(table.tenant_id),
    index('idx_expenses_date').on(table.expense_date),
  ]
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

// ---- Technician Rates & Compensation Rules ----
export const technicianRates = pgTable(
  'technician_rates',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    technician_id: uuid('technician_id').references(() => users.id, { onDelete: 'cascade' }),
    base_closed_rate: decimal('base_closed_rate', { precision: 10, scale: 2 }).$type<number>().default(8.00).notNull(),
    sla_bonus_rate: decimal('sla_bonus_rate', { precision: 10, scale: 2 }).$type<number>().default(4.00).notNull(),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    multiplier_critical: decimal('multiplier_critical', { precision: 4, scale: 2 }).$type<number>().default(2.50).notNull(),
    multiplier_high: decimal('multiplier_high', { precision: 4, scale: 2 }).$type<number>().default(1.75).notNull(),
    multiplier_medium: decimal('multiplier_medium', { precision: 4, scale: 2 }).$type<number>().default(1.25).notNull(),
    multiplier_low: decimal('multiplier_low', { precision: 4, scale: 2 }).$type<number>().default(1.00).notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_tech_rates_tech').on(table.technician_id),
    index('idx_tech_rates_tenant').on(table.tenant_id),
  ]
);

export type TechnicianRate = typeof technicianRates.$inferSelect;
export type NewTechnicianRate = typeof technicianRates.$inferInsert;

// ---- Technician Earnings Ledger ----
export const technicianEarnings = pgTable(
  'technician_earnings',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    ticket_id: uuid('ticket_id')
      .references(() => tickets.id, { onDelete: 'cascade' })
      .notNull(),
    technician_id: uuid('technician_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    base_amount: decimal('base_amount', { precision: 10, scale: 2 }).$type<number>().notNull(),
    sla_bonus_amount: decimal('sla_bonus_amount', { precision: 10, scale: 2 }).$type<number>().default(0).notNull(),
    final_amount: decimal('final_amount', { precision: 10, scale: 2 }).$type<number>().notNull(),
    currency: varchar('currency', { length: 10 }).default('USD').notNull(),
    status: earningStatusEnum('status').default('PENDING').notNull(),
    breakdown: jsonb('breakdown').notNull(),
    expense_id: uuid('expense_id').references(() => expenses.id, { onDelete: 'set null' }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    earned_at: timestamp('earned_at', { withTimezone: true }).defaultNow(),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_earnings_tech').on(table.technician_id),
    index('idx_earnings_ticket').on(table.ticket_id),
    index('idx_earnings_status').on(table.status),
    index('idx_earnings_tenant').on(table.tenant_id),
    index('idx_earnings_earned_at').on(table.earned_at),
  ]
);

export type TechnicianEarning = typeof technicianEarnings.$inferSelect;
export type NewTechnicianEarning = typeof technicianEarnings.$inferInsert;
