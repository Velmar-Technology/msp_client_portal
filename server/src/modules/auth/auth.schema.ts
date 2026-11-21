import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants, users } from '@shared/db/schema';

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

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// ---- Permissions ----
export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    code: varchar('code', { length: 100 }).unique().notNull(),
    module: varchar('module', { length: 50 }).notNull(),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_permissions_code').on(table.code),
    index('idx_permissions_module').on(table.module),
  ]
);

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

// ---- Roles ----
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    tenant_id: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    is_system: boolean('is_system').default(false).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_roles_tenant').on(table.tenant_id),
  ]
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

// ---- Role Permissions ----
export const rolePermissions = pgTable(
  'role_permissions',
  {
    role_id: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permission_id: uuid('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.role_id, table.permission_id] }),
    index('idx_role_permissions_role').on(table.role_id),
    index('idx_role_permissions_perm').on(table.permission_id),
  ]
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

// ---- User Roles ----
export const userRoles = pgTable(
  'user_roles',
  {
    user_id: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role_id: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    tenant_id: uuid('tenant_id')
      .references(() => tenants.id, { onDelete: 'cascade' })
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.role_id] }),
    index('idx_user_roles_user').on(table.user_id),
    index('idx_user_roles_tenant').on(table.tenant_id),
  ]
);

export type UserRoleAssignment = typeof userRoles.$inferSelect;
export type NewUserRoleAssignment = typeof userRoles.$inferInsert;
