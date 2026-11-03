import type { LucideIcon } from 'lucide-react';
import type { NavKey, PermissionRequirement } from '@shared/contracts';
import type { CrumbResolver } from '@/components/layout/routeCrumbs';
import { hasFrontendPermission } from './routeUtils';
import type { AppRouteObject } from './types';

export type SidebarRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
export type SidebarGroup = 'management' | 'operations' | 'account';

export interface FeatureNavSubItem {
  to: string;
  labelKey: string;
  counterKey?: NavKey;
  order?: number;
  requiredPermission?: PermissionRequirement | PermissionRequirement[];
}

export interface FeatureNavEntry {
  to: string;
  /** Icon required for top-level sidebar items; optional when `parentTo` is specified */
  icon?: LucideIcon;
  labelKey: string;
  /** Target sidebar group for top-level items (defaults to 'operations') */
  group?: SidebarGroup;
  /** Optional parent item `to` path (e.g. '/assets' or '/settings-group') to inject this entry as a child sub-item */
  parentTo?: string;
  /** Numeric sort order within the sidebar group or within `parentTo`'s sub-items (e.g. 10, 20, 25, 30) */
  order: number;
  /** Optional fallback roles when `user.permissions` is not hydrated; superseded by `requiredPermission` under Dynamic RBAC (`BL-302`) */
  roles?: SidebarRole[];
  /** Dynamic RBAC capability (or array of alternative capabilities) required to display this item (`BL-302`) */
  requiredPermission?: PermissionRequirement | PermissionRequirement[];
  /** Optional subscription feature code required for entitlement gating */
  requiredFeature?: string;
  /** Roles for which `requiredFeature` gating applies in the sidebar (defaults to ['CLIENT']) */
  featureGatedRoles?: SidebarRole[];
  counterKey?: NavKey;
  items?: FeatureNavSubItem[];
}

export interface FeatureManifest {
  /** Unique feature ID (e.g. 'assets' or 'assets.consumables') */
  id: string;
  /** Optional parent feature ID for hierarchical route prefixing and breadcrumb chaining */
  parentId?: string;
  /**
   * When `parentId` is set, determines whether child routes mount inside the parent route's
   * React Router `children` (`<Outlet />`) or as standalone sibling pages with inherited URL prefix
   * and breadcrumbs. Defaults to `false` (standalone page).
   */
  mountInsideParentOutlet?: boolean;
  routes?: AppRouteObject[];
  navItems?: FeatureNavEntry[];
}

export interface BaseNavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  groupLabelKey?: string;
  order?: number;
  items?: FeatureNavSubItem[];
  requiredFeature?: string;
  counterKey?: NavKey;
}

const GROUP_KEY_TO_GROUP: Record<string, SidebarGroup> = {
  'sidebar.groups.management': 'management',
  'sidebar.groups.operations': 'operations',
  'sidebar.groups.account': 'account',
};

const GROUP_TO_GROUP_KEY: Record<SidebarGroup, string> = {
  management: 'sidebar.groups.management',
  operations: 'sidebar.groups.operations',
  account: 'sidebar.groups.account',
};

const discoveredManifestModules = import.meta.glob<{
  featureManifest?: FeatureManifest;
  default?: FeatureManifest;
}>('@/features/**/manifest.{ts,tsx}', { eager: true });

/**
 * Returns all auto-discovered frontend feature manifests across flat and nested feature folders
 * (`client/src/features/<domain>/manifest.ts` and nested child folders).
 *
 * @returns Array of discovered FeatureManifest objects sorted by id
 */
export function getDiscoveredFeatureManifests(): FeatureManifest[] {
  return Object.values(discoveredManifestModules)
    .map((mod) => mod.featureManifest ?? mod.default)
    .filter((manifest): manifest is FeatureManifest => Boolean(manifest))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Composes a parent CrumbResolver and a child CrumbResolver into a single hierarchical trail.
 */
function chainCrumbResolvers(
  parentCrumb?: CrumbResolver,
  childCrumb?: CrumbResolver
): CrumbResolver | undefined {
  if (!parentCrumb) return childCrumb;
  if (!childCrumb) return parentCrumb;
  return (t, params, user) => {
    const p = parentCrumb(t, params, user);
    const c = childCrumb(t, params, user);
    const pList = Array.isArray(p) ? p : [p];
    const cList = Array.isArray(c) ? c : [c];
    return [...pList, ...cList];
  };
}

/**
 * Resolves flat and hierarchical feature manifests into React Router `AppRouteObject[]`.
 * Supports both standalone child routes (inheriting parent URL prefix and breadcrumb trail)
 * and nested `<Outlet />` child routes (`mountInsideParentOutlet: true`).
 *
 * @param manifests - Feature manifests to resolve (defaults to all auto-discovered manifests)
 * @returns Resolved array of AppRouteObject entries
 */
export function resolveFeatureRoutes(
  manifests: FeatureManifest[] = getDiscoveredFeatureManifests()
): AppRouteObject[] {
  const byId = new Map<string, FeatureManifest>();
  for (const m of manifests) {
    byId.set(m.id, m);
  }

  const getPrimaryRouteInfo = (
    manifest: FeatureManifest,
    visited = new Set<string>()
  ): { basePath: string; crumb?: CrumbResolver } => {
    const firstRoute = manifest.routes?.[0];
    const ownRawPath = firstRoute?.path ?? '';
    const ownNormalized = ownRawPath.startsWith('/')
      ? ownRawPath
      : ownRawPath
        ? `/${ownRawPath}`
        : '';

    if (!manifest.parentId || visited.has(manifest.id)) {
      return { basePath: ownNormalized, crumb: firstRoute?.handle?.crumb };
    }
    visited.add(manifest.id);
    const parent = byId.get(manifest.parentId);
    if (!parent) {
      return { basePath: ownNormalized, crumb: firstRoute?.handle?.crumb };
    }
    const parentInfo = getPrimaryRouteInfo(parent, visited);
    const cleanParentPath = parentInfo.basePath.replace(/\/+$/, '');
    const fullPath =
      cleanParentPath && !ownNormalized.startsWith(`${cleanParentPath}/`) && ownNormalized !== cleanParentPath
        ? `${cleanParentPath}${ownNormalized}`
        : ownNormalized;

    return {
      basePath: fullPath,
      crumb: chainCrumbResolvers(parentInfo.crumb, firstRoute?.handle?.crumb),
    };
  };

  // Clone top-level routes by manifest ID so `mountInsideParentOutlet` children can attach to them
  const clonedRoutesByManifest = new Map<string, AppRouteObject[]>();
  for (const manifest of manifests) {
    const parent = manifest.parentId ? byId.get(manifest.parentId) : undefined;
    const parentInfo = parent ? getPrimaryRouteInfo(parent) : undefined;
    const cleanParentPath = parentInfo?.basePath.replace(/\/+$/, '') ?? '';

    const mappedRoutes = (manifest.routes ?? []).map((route) => {
      const rawPath = route.path ?? '';
      const normalizedPath = rawPath.startsWith('/') ? rawPath : rawPath ? `/${rawPath}` : '';

      const effectivePath = manifest.mountInsideParentOutlet && parent
        ? rawPath.replace(/^\/+/, '')
        : cleanParentPath &&
            !normalizedPath.startsWith(`${cleanParentPath}/`) &&
            normalizedPath !== cleanParentPath
          ? `${cleanParentPath}${normalizedPath}`
          : normalizedPath || rawPath;

      const chainedCrumb = parentInfo
        ? chainCrumbResolvers(parentInfo.crumb, route.handle?.crumb)
        : route.handle?.crumb;

      return {
        ...route,
        path: effectivePath,
        handle: route.handle || chainedCrumb
          ? {
              ...route.handle,
              ...(chainedCrumb ? { crumb: chainedCrumb } : {}),
            }
          : undefined,
        children: route.children ? [...route.children] : undefined,
      } as AppRouteObject;
    });

    clonedRoutesByManifest.set(manifest.id, mappedRoutes);
  }

  const rootRoutes: AppRouteObject[] = [];

  for (const manifest of manifests) {
    const routes = clonedRoutesByManifest.get(manifest.id) ?? [];
    if (manifest.parentId && manifest.mountInsideParentOutlet) {
      const parentRoutes = clonedRoutesByManifest.get(manifest.parentId);
      if (parentRoutes && parentRoutes.length > 0) {
        const primaryParent = parentRoutes[0];
        primaryParent.children = [...(primaryParent.children ?? []), ...routes];
        continue;
      }
    }
    rootRoutes.push(...routes);
  }

  return rootRoutes;
}

/**
 * Aggregates all route definitions exported by auto-discovered feature manifests.
 *
 * @returns Flat and nested AppRouteObject entries across all discovered features
 */
export function getDiscoveredFeatureRoutes(): AppRouteObject[] {
  return resolveFeatureRoutes(getDiscoveredFeatureManifests());
}

/**
 * Merges auto-discovered feature navigation entries (both top-level group items and
 * hierarchical `parentTo` child sub-items) into a role's base navigation list.
 * Supports dual-check Dynamic RBAC capability filtering when `userPermissions` is provided (`BL-302`).
 *
 * @param baseItems - Core static navigation items for the role
 * @param role - Active user role ('CLIENT' | 'TECHNICIAN' | 'ADMIN')
 * @param manifests - Optional manifest override for testing
 * @param userPermissions - Optional dynamic RBAC permissions held by the user
 * @returns Merged and ordered navigation items ready for Sidebar rendering
 */
export function mergeFeatureNavItems<T extends BaseNavItem>(
  baseItems: T[],
  role: SidebarRole,
  manifests: FeatureManifest[] = getDiscoveredFeatureManifests(),
  userPermissions?: string[]
): T[] {
  const allRawEntries = manifests.flatMap((manifest) => manifest.navItems ?? []);
  const parentContainerPaths = new Set(
    allRawEntries.map((e) => e.parentTo).filter((p): p is string => Boolean(p))
  );

  const discoveredEntries = allRawEntries.filter((entry) => {
    // Dynamic RBAC Primary Check (BL-302 / ADR-014 / ADR-017):
    // When userPermissions is hydrated and requiredPermission is declared, evaluate capability directly
    // without blocking on legacy hardcoded role names.
    if (entry.requiredPermission && Array.isArray(userPermissions)) {
      return hasFrontendPermission(userPermissions, entry.requiredPermission);
    }
    // Parent containers without their own requiredPermission are filtered by whether any child remains visible
    if (parentContainerPaths.has(entry.to) && Array.isArray(userPermissions)) {
      return true;
    }
    if (entry.roles && entry.roles.length > 0) {
      return entry.roles.includes(role);
    }
    return true;
  });

  if (discoveredEntries.length === 0) {
    return baseItems;
  }

  const topLevelEntries = discoveredEntries.filter((e) => !e.parentTo);
  const childEntries = discoveredEntries.filter((e) => Boolean(e.parentTo));

  // Bucket base items by their sidebar group while tracking group appearance order
  const groupOrder: SidebarGroup[] = [];
  const buckets = new Map<SidebarGroup, Array<{ item: T; order: number }>>();

  let currentGroup: SidebarGroup = 'operations';
  let implicitIndex = 0;

  for (const rawItem of baseItems) {
    if (rawItem.groupLabelKey && GROUP_KEY_TO_GROUP[rawItem.groupLabelKey]) {
      currentGroup = GROUP_KEY_TO_GROUP[rawItem.groupLabelKey];
      implicitIndex = 0;
    }
    if (!groupOrder.includes(currentGroup)) {
      groupOrder.push(currentGroup);
      buckets.set(currentGroup, []);
    }
    implicitIndex += 1;
    const itemOrder = rawItem.order ?? implicitIndex * 10;
    const cleanItem = {
      ...rawItem,
      groupLabelKey: undefined,
      items: rawItem.items ? rawItem.items.map((sub, idx) => ({ ...sub, order: sub.order ?? (idx + 1) * 10 })) : undefined,
    } as T;
    buckets.get(currentGroup)!.push({ item: cleanItem, order: itemOrder });
  }

  for (const entry of topLevelEntries) {
    const targetGroup = entry.group ?? 'operations';
    if (!groupOrder.includes(targetGroup)) {
      groupOrder.push(targetGroup);
      buckets.set(targetGroup, []);
    }
    const gatedRoles = entry.featureGatedRoles ?? ['CLIENT'];
    const effectiveFeature = gatedRoles.includes(role) ? entry.requiredFeature : undefined;

    const existingList = buckets.get(targetGroup)!;
    if (existingList.some((existing) => existing.item.to === entry.to)) {
      continue;
    }

    const navItem = {
      to: entry.to,
      icon: entry.icon,
      labelKey: entry.labelKey,
      ...(effectiveFeature ? { requiredFeature: effectiveFeature } : {}),
      ...(entry.counterKey ? { counterKey: entry.counterKey } : {}),
      ...(entry.items
        ? {
            items: entry.items.map((sub, idx) => ({
              ...sub,
              order: sub.order ?? (idx + 1) * 10,
            })),
          }
        : {}),
    } as T;

    existingList.push({ item: navItem, order: entry.order });
  }

  // Attach hierarchical child `parentTo` entries into their parent item's `items` array sorted by `order`
  if (childEntries.length > 0) {
    const allItemsByTo = new Map<string, T>();
    for (const group of groupOrder) {
      for (const wrapped of buckets.get(group) ?? []) {
        allItemsByTo.set(wrapped.item.to, wrapped.item);
      }
    }

    for (const child of childEntries) {
      const parentItem = child.parentTo ? allItemsByTo.get(child.parentTo) : undefined;
      if (!parentItem) continue;

      const currentSubs: FeatureNavSubItem[] = parentItem.items ? [...parentItem.items] : [];
      if (currentSubs.some((sub) => sub.to === child.to)) {
        continue;
      }

      currentSubs.push({
        to: child.to,
        labelKey: child.labelKey,
        ...(child.counterKey ? { counterKey: child.counterKey } : {}),
        order: child.order,
      });

      currentSubs.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
      parentItem.items = currentSubs;
    }
  }

  const merged: T[] = [];
  for (const group of groupOrder) {
    const groupEntries = (buckets.get(group) ?? []).filter((wrapped) => {
      // Hide parent container items if all of their child sub-items were filtered out
      if (parentContainerPaths.has(wrapped.item.to)) {
        return Boolean(wrapped.item.items && wrapped.item.items.length > 0);
      }
      return true;
    });
    groupEntries.sort((a, b) => a.order - b.order);
    groupEntries.forEach((entry, index) => {
      if (index === 0) {
        merged.push({
          ...entry.item,
          groupLabelKey: GROUP_TO_GROUP_KEY[group],
        });
      } else {
        merged.push(entry.item);
      }
    });
  }

  return merged;
}
