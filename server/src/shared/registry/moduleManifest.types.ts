import type { Router } from 'express';

/**
 * Express route cluster mount specification for a domain module.
 */
export interface ModuleRouteMount {
  /** URL path prefix mounted on `gatewayClusterRouter` (e.g. '/assets' or child '/consumables') */
  prefix: string;
  /** Express Router handling the mounted prefix */
  router: Router;
}

/**
 * Optional fallback role capability grants used only when a tenant/user has no
 * custom dynamic RBAC roles assigned in PostgreSQL (`user_roles` / `role_permissions`).
 */
export interface ModulePermissionConfig {
  /** Capabilities granted to ADMIN fallback */
  admin?: string[];
  /** Default capabilities granted to TECHNICIAN fallback */
  technician?: string[];
  /** Default capabilities granted to CLIENT fallback */
  client?: string[];
}

/**
 * Declarative Dynamic RBAC rule parsed from a module's colocated `security.csv` file (`ADR-017` / `BL-302`).
 * Maps 1:1 to the `permissions` (`code`, `module`, `description`) and `role_permissions` (`roles`) tables.
 */
export interface SecurityRuleDefinition {
  /** Atomic capability code (e.g. 'helpdesk:tickets:read') */
  code: string;
  /** Top-level or domain module name (e.g. 'helpdesk') */
  module: string;
  /** Human-readable capability description for the Admin RBAC matrix */
  description: string;
  /** Default role names granted this capability on initial DB seed (e.g. ['ADMIN', 'TECHNICIAN', 'CLIENT']) */
  roles: string[];
}

/**
 * Extracted static permission registration record generated into `permissions.generated.ts`.
 */
export interface ServerModulePermissions {
  /** Atomic capability codes declared by the module for the Dynamic RBAC catalog (`permissions` table) */
  catalog?: string[];
  /** Optional fallback role grants for initial DB seeding / unmigrated sessions */
  admin?: string[];
  technician?: string[];
  client?: string[];
}

/**
 * Self-registering backend domain module manifest.
 * Place in `server/src/modules/<domain>/manifest.ts` or nested
 * `server/src/modules/<parent>/<child>/manifest.ts` for automatic discovery.
 */
export interface ServerModuleManifest {
  /** Unique module identifier (e.g. 'assets' or 'assets.consumables') */
  id: string;
  /** Optional parent module ID for hierarchical prefix inheritance (e.g. 'assets') */
  parentId?: string;
  /**
   * Optional base URL prefix for pure parent container modules that do not mount
   * their own Express router (defaults to `/${id.replace(/\./g, '/')}`).
   */
  basePrefix?: string;
  /** Gateway routes to mount automatically */
  routes?: ModuleRouteMount[];
  /**
   * Atomic Dynamic RBAC permission catalog declared by this module
   * (e.g. `['helpdesk:kb:read', 'helpdesk:kb:create', 'helpdesk:kb:update', 'helpdesk:kb:delete']`).
   * Also accepts legacy `ModulePermissionConfig` object for backwards compatibility.
   */
  permissions?: string[] | ModulePermissionConfig;
  /**
   * Optional default role capability grants used only as seed/fallback defaults
   * when no custom DB role assignments exist for a user.
   */
  defaultRoleGrants?: ModulePermissionConfig;
}

/**
 * Resolves effective gateway route mounts across flat and hierarchical module manifests.
 * When a child module specifies `parentId`, its route prefixes are automatically joined
 * onto the parent module's primary route prefix unless already prefixed.
 *
 * Resolved mounts are sorted most-specific first (deepest path segments first) so
 * parameterized parent routes (e.g. `GET /helpdesk/:id`) never shadow child sub-module
 * routes (e.g. `GET /helpdesk/tickets`).
 *
 * @param manifests - Array of discovered ServerModuleManifest objects
 * @returns Resolved array of ModuleRouteMount objects sorted by path specificity
 */
export function resolveModuleRouteMounts(manifests: ServerModuleManifest[]): ModuleRouteMount[] {
  const byId = new Map<string, ServerModuleManifest>();
  for (const m of manifests) {
    byId.set(m.id, m);
  }

  const getBasePrefix = (manifest: ServerModuleManifest, visited = new Set<string>()): string => {
    const ownFirst =
      manifest.basePrefix ??
      manifest.routes?.[0]?.prefix ??
      `/${manifest.id.split('.').pop() ?? manifest.id}`;
    const normalizedOwn = ownFirst.startsWith('/') ? ownFirst : ownFirst ? `/${ownFirst}` : '';
    if (!manifest.parentId || visited.has(manifest.id)) {
      return normalizedOwn;
    }
    visited.add(manifest.id);
    const parent = byId.get(manifest.parentId);
    if (!parent) {
      return normalizedOwn;
    }
    const parentPrefix = getBasePrefix(parent, visited).replace(/\/+$/, '');
    if (!parentPrefix || normalizedOwn.startsWith(`${parentPrefix}/`)) {
      return normalizedOwn;
    }
    return `${parentPrefix}${normalizedOwn}`;
  };

  const resolved: ModuleRouteMount[] = [];

  for (const manifest of manifests) {
    const parent = manifest.parentId ? byId.get(manifest.parentId) : undefined;
    const parentPrefix = parent ? getBasePrefix(parent).replace(/\/+$/, '') : '';

    for (const mount of manifest.routes ?? []) {
      const normalized = mount.prefix.startsWith('/') ? mount.prefix : `/${mount.prefix}`;
      const fullPrefix =
        parentPrefix && !normalized.startsWith(`${parentPrefix}/`) && normalized !== parentPrefix
          ? `${parentPrefix}${normalized}`
          : normalized;
      resolved.push({
        prefix: fullPrefix,
        router: mount.router,
      });
    }
  }

  // Sort deeper/more specific prefixes before shallower parent prefixes so
  // e.g. `/helpdesk/tickets` is always mounted before `/helpdesk` (`/:id`).
  return resolved.sort((a, b) => {
    const aDepth = a.prefix.split('/').filter(Boolean).length;
    const bDepth = b.prefix.split('/').filter(Boolean).length;
    if (bDepth !== aDepth) {
      return bDepth - aDepth;
    }
    return b.prefix.length - a.prefix.length;
  });
}
