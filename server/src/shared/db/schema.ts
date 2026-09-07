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
  'RESOLVED_AUTOMATED',
  'CLOSED',
  'CANCELLED',
]);
export const ticketCategoryEnum = pgEnum('ticket_category', ['REPAIR', 'WARRANTY', 'SERVICE_OUTAGE', 'PREVENTATIVE_MAINTENANCE', 'HELPDESK', 'AI']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'EXPIRING', 'EXPIRED', 'CANCELLED']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']);
export const leadStageEnum = pgEnum('lead_stage', ['NEW', 'QUALIFIED', 'PROPOSITION', 'WON', 'LOST']);
export const leadPriorityEnum = pgEnum('lead_priority', ['LOW', 'MEDIUM', 'HIGH']);
export const quotationStatusEnum = pgEnum('quotation_status', ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']);
export const accountStatusEnum = pgEnum('account_status', ['ACTIVE', 'READ_ONLY', 'SUSPENDED', 'PURGED']);
export const earningStatusEnum = pgEnum('earning_status', ['PENDING', 'APPROVED', 'PAID', 'VOIDED']);

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
    equipment_id: uuid('equipment_id').references(() => subscriptionEquipment.id, { onDelete: 'set null' }),
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
    author_name: varchar('author_name', { length: 255 }),
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
  ]
);

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
    index('idx_leads_client').on(table.client_id),
    index('idx_leads_assigned').on(table.assigned_user_id),
    index('idx_leads_created').on(table.created_at),
  ]
);

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

// ---- API Keys ----
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: varchar('description', { length: 255 }),
    expires_in: varchar('expires_in', { length: 10 }).notNull().default('30d'),
    token_hash: varchar('token_hash', { length: 255 }).notNull(),
    last_used_at: timestamp('last_used_at', { withTimezone: true }),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_api_keys_user').on(table.user_id),
    index('idx_api_keys_tenant').on(table.tenant_id),
  ]
);

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

