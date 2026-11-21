import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';
import { tickets } from '@modules/helpdesk/tickets/tickets.schema';

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

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

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

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
