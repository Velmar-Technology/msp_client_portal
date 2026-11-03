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
 * Default RBAC permission capabilities declared by a domain module.
 * Automatically merged into `PermissionService` role capability sets.
 */
export interface ModulePermissionConfig {
  /** Capabilities granted to ADMIN (and registered in ALL_SYSTEM_PERMISSIONS) */
  admin?: string[];
  /** Default capabilities granted to TECHNICIAN role */
  technician?: string[];
  /** Default capabilities granted to CLIENT role */
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
  /** Gateway routes to mount automatically */
  routes?: ModuleRouteMount[];
  /** Default RBAC permissions to register automatically */
  permissions?: ModulePermissionConfig;
}

/**
 * Resolves effective gateway route mounts across flat and hierarchical module manifests.
 * When a child module specifies `parentId`, its route prefixes are automatically joined
 * onto the parent module's primary route prefix unless already prefixed.
 *
 * @param manifests - Array of discovered ServerModuleManifest objects
 * @returns Resolved array of ModuleRouteMount objects with full gateway prefixes
 */
export function resolveModuleRouteMounts(manifests: ServerModuleManifest[]): ModuleRouteMount[] {
  const byId = new Map<string, ServerModuleManifest>();
  for (const m of manifests) {
    byId.set(m.id, m);
  }

  const getBasePrefix = (manifest: ServerModuleManifest, visited = new Set<string>()): string => {
    const ownFirst = manifest.routes?.[0]?.prefix ?? '';
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

  return resolved;
}
