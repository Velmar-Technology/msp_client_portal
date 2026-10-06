import { useAuthStore } from "@/store/useAuthStore";

/**
 * React hook to reactively check fine-grained dynamic capabilities without hardcoding user roles.
 *
 * @example
 * ```tsx
 * const { can } = usePermissions();
 * if (can('crm:leads:write')) {
 *   return <CreateLeadDialog />;
 * }
 * ```
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions || [];
  const isAdmin = user?.role === 'ADMIN';

  /**
   * Checks if user has a specific permission or is an administrator.
   */
  const can = (permissionCode: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permissionCode) || permissions.includes('*');
  };

  /**
   * Checks if user has ALL of the specified permissions.
   */
  const canAll = (...permissionCodes: string[]): boolean => {
    if (isAdmin) return true;
    return permissionCodes.every((code) => can(code));
  };

  /**
   * Checks if user has AT LEAST ONE of the specified permissions.
   */
  const canAny = (...permissionCodes: string[]): boolean => {
    if (isAdmin) return true;
    return permissionCodes.some((code) => can(code));
  };

  return {
    permissions,
    can,
    canAll,
    canAny,
  };
}
