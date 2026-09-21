import { UserContext, UserRole } from '@shared/types';
import type { NavKey } from '@shared/contracts';
import { NavCounterRepository, navCounterRepository } from '../repositories/NavCounterRepository';

const ROLE_NAV_KEYS: Record<UserRole, NavKey[]> = {
  [UserRole.CLIENT]: ['tickets', 'devices', 'resources', 'passwordManager', 'billing', 'maintenance'],
  [UserRole.TECHNICIAN]: ['tickets', 'maintenance'],
  [UserRole.ADMIN]: ['crm', 'tickets', 'billing', 'devices', 'maintenance'],
};

/**
 * Domain service managing navigation counters and seen states for sidebar destinations.
 * Adheres to Clean Architecture: constructor-injected repository, zero direct DB pool imports.
 */
export class NavCounterService {
  constructor(private repo: NavCounterRepository = navCounterRepository) {}

  /**
   * Retrieves navigation counters for all destinations accessible to the user role.
   *
   * @param ctx - User context containing userId, role, and tenantId
   * @returns Map of nav keys to their count and latest activity timestamp
   */
  async getCounters(ctx: UserContext): Promise<Record<NavKey, { count: number; latestAt: string | null }>> {
    const keys = ROLE_NAV_KEYS[ctx.role] ?? [];
    const result: Record<string, { count: number; latestAt: string | null }> = {};

    for (const navKey of keys) {
      const since = await this.repo.getSeenAt(ctx.userId, navKey);
      const { count: c, latestAt } = await this.querySourceCount(ctx, navKey, since);
      result[navKey] = { count: c, latestAt };
    }

    return result as Record<NavKey, { count: number; latestAt: string | null }>;
  }

  /**
   * Marks a navigation destination as seen for the user at current timestamp.
   *
   * @param ctx - User context
   * @param navKey - Navigation destination key
   */
  async markSeen(ctx: UserContext, navKey: NavKey): Promise<void> {
    await this.repo.upsertSeen(ctx, navKey);
  }

  private async querySourceCount(
    ctx: UserContext,
    navKey: NavKey,
    since: Date,
  ): Promise<{ count: number; latestAt: string | null }> {
    switch (navKey) {
      case 'tickets':
        return this.repo.countTickets(ctx, since);
      case 'devices':
        return this.repo.countDeviceAlerts(ctx, since);
      case 'maintenance':
        return this.repo.countMaintenance(ctx, since);
      case 'billing':
        return this.repo.countInvoices(ctx, since);
      case 'crm':
        return this.repo.countLeads(ctx, since);
      case 'notifications':
        return this.repo.countNotifications(ctx, since);
      default:
        return { count: 0, latestAt: null };
    }
  }
}

export const navCounterService = new NavCounterService();
