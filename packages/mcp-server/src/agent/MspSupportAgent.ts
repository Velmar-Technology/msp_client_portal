import type { MspApiClient } from '../client/MspApiClient.js';
import type {
  TicketSummary,
  DeviceTelemetry,
  DevicePatch,
  ClientHealthReport,
  EquipmentSlot,
} from '../types.js';

/**
 * Result structure produced by the autonomous ticket triage workflow.
 */
export interface TicketTriageReport {
  ticket: TicketSummary;
  telemetry?: DeviceTelemetry | null;
  patches?: DevicePatch[];
  slaStatus: {
    withinCancellationWindow: boolean;
    slaCancellationDeadlineMs?: number;
    recommendedEscalation?: boolean;
  };
  metricsAnalysis: {
    cpuWarning: boolean;
    memoryWarning: boolean;
    diskWarning: boolean;
    findings: string[];
  };
  rootCauseHypothesis: string;
  recommendedActions: string[];
  internalTechnicianNote: string;
  clientFacingUpdate: string;
}

/**
 * Result structure produced by the Quarterly Business Review (QBR) workflow.
 */
export interface QbrAuditReport {
  tenantId: string;
  companyName: string;
  compositeHealth: ClientHealthReport;
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  deviceStats: {
    total: number;
    online: number;
    offline: number;
    warning: number;
  };
  ticketStats: {
    total: number;
    open: number;
    resolved: number;
    criticalOrHigh: number;
  };
  topOperationalRisks: string[];
  recommendations: string[];
  strategicRoadmap: string[];
}

/**
 * Autonomous Tier-1 / Tier-2 MSP Support Agent.
 *
 * Implements the core workflows defined in `COPILOT_STUDIO_AGENT_DEPLOYMENT.md`:
 * - Guided Ticket Triage & Root Cause Diagnosis (Workflow A)
 * - Remote Diagnostics & Deep Inspection (Workflow B)
 * - Executive QBR & Health Auditing (Workflow C)
 *
 * Adheres to Master Business Rules:
 * - BL-101: 1-Hour SLA Cancellation Rule (60m window for WARRANTY/SERVICE_OUTAGE)
 * - BL-104: Tier Escalation (CRITICAL 10m, HIGH 20m, MEDIUM 45m, LOW 120m)
 * - BL-601: Account Health Scoring (40% Ticket, 30% Hardware, 30% Security)
 */
export class MspSupportAgent {
  constructor(private readonly apiClient: MspApiClient) {}

  /**
   * Autonomously triages a ticket by inspecting details, correlating live device
   * telemetry and patch status, evaluating SLA windows, and synthesizing draft updates.
   *
   * @param ticketId - The UUID or identifier of the ticket to triage
   * @returns Structured triage report with root cause hypothesis and communications
   * @throws {Error} When the ticket cannot be fetched
   * @see BL-101
   * @see BL-104
   */
  async triageTicket(ticketId: string): Promise<TicketTriageReport> {
    const ticket = await this.apiClient.getTicket(ticketId);

    let telemetry: DeviceTelemetry | null = null;
    let patches: DevicePatch[] = [];

    if (ticket.equipmentId) {
      try {
        telemetry = await this.apiClient.getDeviceTelemetry(ticket.equipmentId);
      } catch {
        telemetry = null;
      }

      try {
        patches = await this.apiClient.listDevicePatches(ticket.equipmentId);
      } catch {
        patches = [];
      }
    }

    // Evaluate SLA window (BL-101)
    const SLA_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
    const createdAtMs = new Date(ticket.createdAt).getTime();
    const ageMs = Date.now() - createdAtMs;
    const isSlaRestrictedCategory =
      ticket.category === 'WARRANTY' || ticket.category === 'SERVICE_OUTAGE';
    const withinCancellationWindow = !isSlaRestrictedCategory || ageMs <= SLA_WINDOW_MS;

    // Evaluate Tier 2 Escalation (BL-104)
    let recommendedEscalation = false;
    if (ticket.status === 'OPEN') {
      const ageMinutes = ageMs / (60 * 1000);
      if (
        (ticket.priority === 'CRITICAL' && ageMinutes > 10) ||
        (ticket.priority === 'HIGH' && ageMinutes > 20) ||
        (ticket.priority === 'MEDIUM' && ageMinutes > 45) ||
        (ticket.priority === 'LOW' && ageMinutes > 120)
      ) {
        recommendedEscalation = true;
      }
    }

    // Evaluate Hardware Metrics
    const findings: string[] = [];
    const cpuWarning = (telemetry?.cpuUsage ?? 0) > 80;
    const memoryWarning = (telemetry?.memoryUsage ?? 0) > 85;
    const diskWarning =
      (telemetry?.diskUsage ?? 0) > 90 ||
      (telemetry?.diskTotalGb && telemetry?.diskUsedGb
        ? (telemetry.diskTotalGb - telemetry.diskUsedGb) < 10
        : false);

    if (cpuWarning) {
      findings.push(`Elevated CPU utilization (${telemetry?.cpuUsage}%).`);
    }
    if (memoryWarning) {
      findings.push(`Severe memory pressure (${telemetry?.memoryUsage}%).`);
    }
    if (diskWarning) {
      findings.push(`Low disk free space (${telemetry?.diskUsage}% used).`);
    }

    const pendingCriticalPatches = patches.filter(
      (p) => p.status === 'PENDING' && (p.severity === 'CRITICAL' || p.severity === 'HIGH')
    ).length;

    if (pendingCriticalPatches > 0) {
      findings.push(`${pendingCriticalPatches} pending high/critical security patches.`);
    }

    // Synthesize Root Cause Hypothesis
    let rootCauseHypothesis = 'Under investigation.';
    const recommendedActions: string[] = [];

    if (memoryWarning && diskWarning) {
      rootCauseHypothesis =
        'Compound resource exhaustion: Virtual memory paging thrashing against depleted primary volume.';
      recommendedActions.push(
        'Execute `msp_clean_temp_storage` (with user confirmation) to free disk space.',
        'Inspect high-memory processes using `msp_remote_list_processes`.'
      );
    } else if (memoryWarning) {
      rootCauseHypothesis = 'Memory leak or capacity saturation on endpoint.';
      recommendedActions.push(
        'Inspect top process memory consumers.',
        'Advise restart of offending service or application.'
      );
    } else if (diskWarning) {
      rootCauseHypothesis = 'Primary system storage partition exhausted (<10% free).';
      recommendedActions.push(
        'Execute `msp_analyze_disk_storage` to pinpoint large cache directories.',
        'Request permission to run `msp_clean_temp_storage`.'
      );
    } else if (cpuWarning) {
      rootCauseHypothesis = 'CPU throttling or rogue runaway process.';
      recommendedActions.push(
        'Check listening processes or Windows services requiring restart.'
      );
    } else {
      rootCauseHypothesis = `Issue correlates with ticket category "${ticket.category}": "${ticket.title}". Hardware telemetry within normal operating thresholds.`;
      recommendedActions.push('Follow standard helpdesk troubleshooting runbook.');
    }

    if (recommendedEscalation) {
      recommendedActions.unshift('Escalate ticket to Tier-2 engineering per SLA escalation rule (BL-104).');
    }

    // Draft Internal Technician Note
    const internalTechnicianNote = [
      `### 🔍 Autonomous Triage Report (Ticket #${ticket.id})`,
      `* **Category:** ${ticket.category} | **Priority:** ${ticket.priority} | **Status:** ${ticket.status}`,
      `* **SLA Window Status:** ${withinCancellationWindow ? 'Within Window' : 'SLA Window Expired'}`,
      `* **Root Cause Hypothesis:** ${rootCauseHypothesis}`,
      telemetry
        ? `* **Telemetry:** CPU: ${telemetry.cpuUsage}% | RAM: ${telemetry.memoryUsage}% | Disk: ${telemetry.diskUsage}% | Agent: ${telemetry.agentStatus}`
        : `* **Telemetry:** No linked hardware telemetry available.`,
      findings.length > 0 ? `* **Alert Flags:** ${findings.join(' ')}` : '',
      `* **Next Steps:**\n  - ${recommendedActions.join('\n  - ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    // Draft Client-Facing Update
    const clientFacingUpdate = [
      `Hello,`,
      ``,
      `Our automated support copilot has completed an initial diagnostic assessment of your request (Ticket #${ticket.id}).`,
      findings.length > 0
        ? `Our analysis identified: ${findings.join(' ')}`
        : `Our technical team has received your ticket details and confirmed system parameters are being reviewed.`,
      ``,
      `An engineer has been assigned to apply the recommended remediation steps. You will receive further updates as soon as progress is made.`,
    ].join('\n');

    return {
      ticket,
      telemetry,
      patches,
      slaStatus: {
        withinCancellationWindow,
        slaCancellationDeadlineMs: isSlaRestrictedCategory
          ? createdAtMs + SLA_WINDOW_MS
          : undefined,
        recommendedEscalation,
      },
      metricsAnalysis: {
        cpuWarning,
        memoryWarning,
        diskWarning,
        findings,
      },
      rootCauseHypothesis,
      recommendedActions,
      internalTechnicianNote,
      clientFacingUpdate,
    };
  }

  /**
   * Evaluates organization health and generates a comprehensive Quarterly
   * Business Review (QBR) IT briefing.
   *
   * @param tenantId - The target client tenant UUID
   * @param companyName - Optional display name of the client company
   * @returns Structured QBR audit report
   * @see BL-601
   */
  async generateQbrReport(tenantId: string, companyName?: string): Promise<QbrAuditReport> {
    const [compositeHealth, equipmentList, tickets] = await Promise.all([
      this.apiClient.getClientHealth(tenantId),
      this.apiClient.getClientEquipment(tenantId).catch(() => [] as EquipmentSlot[]),
      this.apiClient.listTickets({ tenantId }).catch(() => [] as TicketSummary[]),
    ]);

    const resolvedCompanyName = companyName || compositeHealth.tenantName || 'Client Organization';

    // Assign letter grade based on composite health score (0-100)
    const score = compositeHealth.score ?? 100;
    let letterGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) letterGrade = 'A';
    else if (score >= 80) letterGrade = 'B';
    else if (score >= 70) letterGrade = 'C';
    else if (score >= 60) letterGrade = 'D';
    else letterGrade = 'F';

    // Device Stats
    let onlineCount = 0;
    let offlineCount = 0;
    let warningCount = 0;

    for (const slot of equipmentList) {
      const status = ((slot as any).agentStatus || slot.status || '').toUpperCase();
      if (status === 'ONLINE' || status === 'ACTIVE') onlineCount++;
      else if (status === 'OFFLINE') offlineCount++;
      else warningCount++;
    }

    // Ticket Stats
    let openCount = 0;
    let resolvedCount = 0;
    let criticalOrHighCount = 0;

    for (const t of tickets) {
      if (t.status === 'OPEN' || t.status === 'IN_PROGRESS') openCount++;
      if (t.status === 'RESOLVED' || t.status === 'RESOLVED_AUTOMATED' || t.status === 'CLOSED') {
        resolvedCount++;
      }
      if (t.priority === 'CRITICAL' || t.priority === 'HIGH') {
        criticalOrHighCount++;
      }
    }

    // Top Operational Risks
    const topOperationalRisks: string[] = [];
    if (score < 70) {
      topOperationalRisks.push(
        `Overall account health score is below SLA threshold (${score}% < 70%). Immediate QBR review required (BL-601).`
      );
    }
    if (offlineCount > 0) {
      topOperationalRisks.push(
        `${offlineCount} endpoint(s) currently unmanaged or offline with RMM agent disconnected.`
      );
    }
    if (criticalOrHighCount > 3) {
      topOperationalRisks.push(
        `High concentration of severe tickets (${criticalOrHighCount} Critical/High tickets logged).`
      );
    }
    if (topOperationalRisks.length === 0) {
      topOperationalRisks.push('Zero critical operational risks detected. All systems operating within baseline parameters.');
    }

    // Strategic Recommendations & Roadmap
    const recommendations: string[] = [
      'Maintain automated patch management cycle for all enrolled workstations.',
      'Deploy Rust RMM agent to any remaining unmanaged client endpoints.',
    ];
    if (letterGrade === 'C' || letterGrade === 'D' || letterGrade === 'F') {
      recommendations.push('Schedule on-site technical inspection and audit of core network switches.');
    }

    const strategicRoadmap: string[] = [
      'Phase 1 (Days 1-30): Address high-severity patch backlogs and resolve open ticket queues.',
      'Phase 2 (Days 31-60): Implement BitLocker encryption and Zero Standing Privileges (ZSP) across endpoints.',
      'Phase 3 (Days 61-90): Review hardware lifecycle and decommission aging workstations over 5 years old.',
    ];

    return {
      tenantId,
      companyName: resolvedCompanyName,
      compositeHealth,
      letterGrade,
      deviceStats: {
        total: equipmentList.length,
        online: onlineCount,
        offline: offlineCount,
        warning: warningCount,
      },
      ticketStats: {
        total: tickets.length,
        open: openCount,
        resolved: resolvedCount,
        criticalOrHigh: criticalOrHighCount,
      },
      topOperationalRisks,
      recommendations,
      strategicRoadmap,
    };
  }
}
