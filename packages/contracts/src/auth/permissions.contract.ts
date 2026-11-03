import type {
  SystemPermissionCode,
  BaseSystemPermissionCode,
  DiscoveredModulePermissionCode,
} from './permissions.generated';

export * from './permissions.generated';

/**
 * Flexible capability requirement type:
 * Provides IDE compile-time autocomplete for all known system permission codes,
 * while allowing wildcard scopes (e.g. 'assets:*') and custom database-driven capabilities.
 *
 * @see BL-302
 * @see ADR-014
 * @see ADR-017
 */
export type PermissionRequirement =
  | SystemPermissionCode
  | `${string}:*`
  | (string & {});

export type {
  SystemPermissionCode,
  BaseSystemPermissionCode,
  DiscoveredModulePermissionCode,
};
