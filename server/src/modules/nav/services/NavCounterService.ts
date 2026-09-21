import { db, userNavViews, tickets, ticketResponses, rmmAlerts, deviceMaintenances, invoices, leads, notifications } from '@shared/db';
import { eq, and, gt, count, sql, notInArray, or, isNull, ne } from 'drizzle-orm';
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

  /**
   * Calculates unread actionable tickets for the user.
   *
   * Rules:
   * - Excludes inactive/terminal statuses ('CLOSED', 'CANCELLED', 'RESOLVED', 'RESOLVED_AUTOMATED').
   * - Scoped by role:
   *   - CLIENT: tickets opened by client.
   *   - TECHNICIAN: tickets assigned to tech OR unassigned tickets with status 'OPEN'.
   *   - ADMIN: all active tickets within the tenant.
   * - Excludes self-action noise: activity must not originate solely from the requesting user.
   *
   * @param ctx - User context containing userId, role, and tenantId
   * @param since - Cutoff timestamp (user's last_seen_at for 'tickets')
   * @returns Count of unread actionable tickets and the latest activity timestamp
   */
  private async countTickets(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const conditions = [
      gt(tickets.updated_at, since),
      notInArray(tickets.status, ['CLOSED', 'CANCELLED', 'RESOLVED', 'RESOLVED_AUTOMATED']),
    ];

    if (ctx.role === UserRole.CLIENT) {
      conditions.push(eq(tickets.client_id, ctx.userId));
    } else if (ctx.role === UserRole.TECHNICIAN) {
      // My assigned tickets OR unassigned open triage pool
      conditions.push(
        or(
          eq(tickets.assigned_tech_id, ctx.userId),
          and(isNull(tickets.assigned_tech_id), eq(tickets.status, 'OPEN')),
        )!,
      );
    } else {
      conditions.push(eq(tickets.tenant_id, ctx.tenantId));
    }

    // Exclude own-action noise:
    // A ticket is considered unread only if:
    // 1) It was created by someone else after `since`, OR
    // 2) There is a response created after `since` authored by someone else.
    // That way, if the user themselves created the ticket or posted the last reply,
    // their own update doesn't falsely bump their own unread counter.
    conditions.push(
      or(
        and(ne(tickets.client_id, ctx.userId), gt(tickets.created_at, since)),
        sql`EXISTS (
          SELECT 1 FROM ${ticketResponses} tr
          WHERE tr.ticket_id = ${tickets.id}
            AND tr.user_id != ${ctx.userId}
            AND tr.created_at > ${since}
            ${ctx.role === UserRole.CLIENT ? sql`AND tr.is_internal = false` : sql``}
        )`,
      )!,
    );

    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${tickets.updated_at})`,
      })
      .from(tickets)
      .where(and(...conditions));

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countDeviceAlerts(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${rmmAlerts.created_at})`,
      })
      .from(rmmAlerts)
      .where(
        and(
          eq(rmmAlerts.tenant_id, ctx.tenantId),
          gt(rmmAlerts.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countMaintenance(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${deviceMaintenances.updated_at})`,
      })
      .from(deviceMaintenances)
      .where(
        and(
          eq(deviceMaintenances.tenant_id, ctx.tenantId),
          gt(deviceMaintenances.updated_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countInvoices(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${invoices.created_at})`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.tenant_id, ctx.tenantId),
          gt(invoices.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countLeads(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${leads.updated_at})`,
      })
      .from(leads)
      .where(
        and(
          eq(leads.tenant_id, ctx.tenantId),
          gt(leads.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }

  private async countNotifications(ctx: UserContext, since: Date): Promise<{ count: number; latestAt: string | null }> {
    const rows = await db
      .select({
        cnt: count(),
        latest: sql<string>`max(${notifications.created_at})`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, ctx.userId),
          eq(notifications.read, false),
          gt(notifications.created_at, since),
        ),
      );

    return { count: rows[0]?.cnt ?? 0, latestAt: rows[0]?.latest ?? null };
  }
}

export const navCounterService = new NavCounterService();
