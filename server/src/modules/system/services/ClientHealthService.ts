import { db, tickets, subscriptionEquipment, rmmDeviceTelemetry, tenants } from '@shared/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';

export interface ClientHealthReport {
  tenantId: string;
  tenantName: string;
  score: number;
  ticketHealth: number;
  hardwareHealth: number;
  securityHealth: number;
  openTicketCount: number;
  criticalTicketCount: number;
  outdatedDeviceCount: number;
  slaBreachRisk: boolean;
  recommendations: string[];
}

/**
 * Domain service calculating client tenant composite health scores per BL-601.
 * Formula: H = 0.40 * S_ticket + 0.30 * S_hardware + 0.30 * S_security
 * Letter grade threshold: Score < 70% flags a QBR review task.
 *
 * @see BL-601
 */
export class ClientHealthService {
  /**
   * Calculates comprehensive client health report across tickets, hardware, and security postures.
   *
   * @param tenantId - Target tenant UUID
   * @returns Comprehensive ClientHealthReport
   */
  async calculateScore(tenantId: string): Promise<ClientHealthReport> {
    // 1. Resolve Tenant Identity
    const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const tenantName = tenantRows[0]?.name || 'Client Workspace';

    // 2. Query Tenant Tickets
    const tenantTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.tenant_id, tenantId));

    const openStatuses = new Set(['OPEN', 'IN_PROGRESS', 'AWAITING_PAYMENT']);
    const openTickets = tenantTickets.filter((t) => openStatuses.has(t.status));
    const criticalTickets = openTickets.filter((t) => t.priority === 'CRITICAL');

    // SLA breach risk check (CRITICAL open > 10m, HIGH open > 20m, etc. per BL-104)
    const now = Date.now();
    let slaBreachRisk = false;
    for (const t of openTickets) {
      const createdAt = t.created_at ? new Date(t.created_at).getTime() : now;
      const ageMs = now - createdAt;
      if (t.priority === 'CRITICAL' && ageMs > 10 * 60 * 1000) slaBreachRisk = true;
      if (t.priority === 'HIGH' && ageMs > 20 * 60 * 1000) slaBreachRisk = true;
      if (t.priority === 'MEDIUM' && ageMs > 45 * 60 * 1000) slaBreachRisk = true;
    }

    let ticketHealth = 100;
    ticketHealth -= criticalTickets.length * 25;
    ticketHealth -= (openTickets.length - criticalTickets.length) * 5;
    if (slaBreachRisk) ticketHealth -= 20;
    ticketHealth = Math.max(0, Math.min(100, ticketHealth));

    // 3. Query Tenant Hardware & Telemetry
    const equipmentRows = await db
      .select({
        id: subscriptionEquipment.id,
        status: subscriptionEquipment.status,
        device_name: subscriptionEquipment.device_name,
        agent_last_seen_at: subscriptionEquipment.agent_last_seen_at,
        cpu_usage: rmmDeviceTelemetry.cpu_usage,
        memory_usage: rmmDeviceTelemetry.memory_usage,
        disk_usage: rmmDeviceTelemetry.disk_usage,
        pending_patch_count: rmmDeviceTelemetry.pending_patch_count,
        last_sync_at: rmmDeviceTelemetry.last_sync_at,
      })
      .from(subscriptionEquipment)
      .leftJoin(rmmDeviceTelemetry, eq(subscriptionEquipment.id, rmmDeviceTelemetry.equipment_id))
      .where(
        and(
          eq(subscriptionEquipment.tenant_id, tenantId),
          eq(subscriptionEquipment.status, 'ACTIVE')
        )
      );

    let hardwareHealth = 100;
    let securityHealth = 100;
    let outdatedDeviceCount = 0;
    let totalPendingPatches = 0;

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    if (equipmentRows.length > 0) {
      for (const dev of equipmentRows) {
        const lastActivity = Math.max(
          dev.last_sync_at ? new Date(dev.last_sync_at).getTime() : 0,
          dev.agent_last_seen_at ? new Date(dev.agent_last_seen_at).getTime() : 0
        );

        const isInactive = lastActivity === 0 || lastActivity < sevenDaysAgo;
        const diskUsage = Number(dev.disk_usage ?? 0);
        const memUsage = Number(dev.memory_usage ?? 0);
        const patchCount = dev.pending_patch_count || 0;
        totalPendingPatches += patchCount;

        if (isInactive || patchCount > 3) {
          outdatedDeviceCount++;
        }

        if (isInactive) {
          hardwareHealth -= 15;
        }
        if (diskUsage > 85) {
          hardwareHealth -= 15;
        }
        if (memUsage > 90) {
          hardwareHealth -= 10;
        }

        securityHealth -= patchCount * 8;
      }
    }

    hardwareHealth = Math.max(0, Math.min(100, hardwareHealth));
    securityHealth = Math.max(0, Math.min(100, securityHealth));

    // 4. Composite Formula: BL-601
    const compositeScore = Math.round(
      0.4 * ticketHealth + 0.3 * hardwareHealth + 0.3 * securityHealth
    );

    // 5. Generate Actionable Recommendations
    const recommendations: string[] = [];
    if (criticalTickets.length > 0) {
      recommendations.push(`Triage ${criticalTickets.length} CRITICAL ticket(s) to avoid SLA default.`);
    }
    if (slaBreachRisk) {
      recommendations.push('Unworked open tickets have exceeded tier escalation thresholds (BL-104).');
    }
    if (outdatedDeviceCount > 0) {
      recommendations.push(`Update patches and check offline status for ${outdatedDeviceCount} endpoint(s).`);
    }
    if (totalPendingPatches > 0) {
      recommendations.push(`Deploy ${totalPendingPatches} pending security patch updates across the workstation fleet.`);
    }
    if (compositeScore < 70) {
      recommendations.push('Client health is below 70% threshold. Schedule an executive Quarterly Business Review (QBR).');
    }
    if (recommendations.length === 0) {
      recommendations.push('All client systems, hardware fleet, and ticket SLAs are operating within optimal parameters.');
    }

    logger.info(`[ClientHealthService] Evaluated health score for tenant ${tenantId}: ${compositeScore}%`);

    return {
      tenantId,
      tenantName,
      score: compositeScore,
      ticketHealth,
      hardwareHealth,
      securityHealth,
      openTicketCount: openTickets.length,
      criticalTicketCount: criticalTickets.length,
      outdatedDeviceCount,
      slaBreachRisk,
      recommendations,
    };
  }
}

export const clientHealthService = new ClientHealthService();
