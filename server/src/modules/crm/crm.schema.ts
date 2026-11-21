import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';
import { plans } from '@modules/subscriptions/subscriptions.schema';

// ---- CRM Enums ----
export const leadStageEnum = pgEnum('lead_stage', [
  'NEW',
  'QUALIFIED',
  'PROPOSITION',
  'WON',
  'LOST',
]);

export const leadPriorityEnum = pgEnum('lead_priority', ['LOW', 'MEDIUM', 'HIGH']);

export const quotationStatusEnum = pgEnum('quotation_status', [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
]);

// ---- CRM Leads ----
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    client_id: uuid('client_id').references(() => users.id, { onDelete: 'set null' }),
    contact_name: varchar('contact_name', { length: 255 }).notNull(),
    contact_email: varchar('contact_email', { length: 255 }).notNull(),
    contact_phone: varchar('contact_phone', { length: 50 }),
    company_name: varchar('company_name', { length: 255 }),
    stage: leadStageEnum('stage').default('NEW').notNull(),
    client_type: varchar('client_type', { length: 50 }).default('CLIENT').notNull(),
    plan_id: varchar('plan_id', { length: 50 }).references(() => plans.id, { onDelete: 'set null' }),
    billing_cycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull(),
    equipment_count: integer('equipment_count').default(1).notNull(),
    expected_revenue: decimal('expected_revenue', { precision: 12, scale: 2 }).$type<number>().default(0).notNull(),
    probability: integer('probability').default(10).notNull(),
    priority: leadPriorityEnum('priority').default('MEDIUM').notNull(),
    assigned_user_id: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    notes: text('notes'),
    lost_reason: varchar('lost_reason', { length: 255 }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_leads_tenant').on(table.tenant_id),
    index('idx_leads_stage').on(table.stage),
    index('idx_leads_client_type').on(table.client_type),
    index('idx_leads_client').on(table.client_id),
    index('idx_leads_assigned').on(table.assigned_user_id),
    index('idx_leads_created').on(table.created_at),
  ]
);

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

// ---- CRM Quotations ----
export const quotations = pgTable(
  'quotations',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    quotation_number: varchar('quotation_number', { length: 50 }).unique().notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    lead_id: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    client_id: uuid('client_id').references(() => users.id, { onDelete: 'set null' }),
    recipient_name: varchar('recipient_name', { length: 255 }).notNull(),
    recipient_email: varchar('recipient_email', { length: 255 }).notNull(),
    plan_id: varchar('plan_id', { length: 50 })
      .references(() => plans.id)
      .notNull(),
    billing_cycle: varchar('billing_cycle', { length: 20 }).default('monthly').notNull(),
    equipment_count: integer('equipment_count').default(1).notNull(),
    subtotal: decimal('subtotal', { precision: 12, scale: 2 }).$type<number>().default(0).notNull(),
    tax: decimal('tax', { precision: 12, scale: 2 }).$type<number>().default(0).notNull(),
    total: decimal('total', { precision: 12, scale: 2 }).$type<number>().default(0).notNull(),
    status: quotationStatusEnum('status').default('SENT').notNull(),
    valid_until: timestamp('valid_until', { withTimezone: true }),
    sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow(),
    last_reminder_sent_at: timestamp('last_reminder_sent_at', { withTimezone: true }),
    created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_quotations_tenant').on(table.tenant_id),
    index('idx_quotations_lead').on(table.lead_id),
    index('idx_quotations_client').on(table.client_id),
    index('idx_quotations_number').on(table.quotation_number),
    index('idx_quotations_status').on(table.status),
  ]
);

export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;

// ---- CRM Lead Activities (Follow-up Procedures & Chatter) ----
export const leadActivities = pgTable(
  'lead_activities',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    lead_id: uuid('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    activity_type: varchar('activity_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    summary: text('summary'),
    due_date: timestamp('due_date', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    status: varchar('status', { length: 50 }).default('COMPLETED').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_lead_activities_lead').on(table.lead_id),
    index('idx_lead_activities_tenant').on(table.tenant_id),
    index('idx_lead_activities_due').on(table.due_date),
    index('idx_lead_activities_status').on(table.status),
  ]
);

export type LeadActivity = typeof leadActivities.$inferSelect;
export type NewLeadActivity = typeof leadActivities.$inferInsert;
