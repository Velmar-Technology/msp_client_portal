import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MspSupportAgent } from './MspSupportAgent.js';
import type { MspApiClient } from '../client/MspApiClient.js';
import type {
  TicketSummary,
  DeviceTelemetry,
  DevicePatch,
  ClientHealthReport,
  EquipmentSlot,
} from '../types.js';

describe('MspSupportAgent', () => {
  let mockApiClient: Partial<MspApiClient>;
  let agent: MspSupportAgent;

  beforeEach(() => {
    mockApiClient = {
      getTicket: vi.fn(),
      getDeviceTelemetry: vi.fn(),
      listDevicePatches: vi.fn(),
      getClientHealth: vi.fn(),
      getClientEquipment: vi.fn(),
      listTickets: vi.fn(),
    };
    agent = new MspSupportAgent(mockApiClient as MspApiClient);
  });

  describe('triageTicket', () => {
    it('should correctly triage a ticket with high memory pressure and low disk space', async () => {
      const mockTicket: TicketSummary = {
        id: 'TICKET-001',
        title: 'Workstation running extremely slow and freezing',
        description: 'User reports Outlook freezes and system hangs.',
        category: 'REPAIR',
        status: 'OPEN',
        priority: 'HIGH',
        clientId: 'client-1',
        equipmentId: 'eq-001',
        tenantId: 'tenant-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockTelemetry: DeviceTelemetry = {
        id: 'telem-1',
        equipmentId: 'eq-001',
        agentStatus: 'ONLINE',
        cpuUsage: 88,
        memoryUsage: 94,
        diskUsage: 92,
        diskUsedGb: 240,
        diskTotalGb: 256,
        pendingPatchCount: 3,
        tenantId: 'tenant-1',
      };

      const mockPatches: DevicePatch[] = [
        {
          id: 'patch-1',
          equipmentId: 'eq-001',
          patchId: 'KB5001234',
          title: 'Security Update for Windows 11',
          severity: 'CRITICAL',
          status: 'PENDING',
        },
      ];

      vi.mocked(mockApiClient.getTicket!).mockResolvedValue(mockTicket);
      vi.mocked(mockApiClient.getDeviceTelemetry!).mockResolvedValue(mockTelemetry);
      vi.mocked(mockApiClient.listDevicePatches!).mockResolvedValue(mockPatches);

      const report = await agent.triageTicket('TICKET-001');

      expect(report.ticket.id).toBe('TICKET-001');
      expect(report.metricsAnalysis.memoryWarning).toBe(true);
      expect(report.metricsAnalysis.cpuWarning).toBe(true);
      expect(report.metricsAnalysis.diskWarning).toBe(true);
      expect(report.rootCauseHypothesis).toContain('Compound resource exhaustion');
      expect(report.internalTechnicianNote).toContain('Autonomous Triage Report');
      expect(report.clientFacingUpdate).toContain('support copilot');
      expect(report.slaStatus.withinCancellationWindow).toBe(true);
    });

    it('should flag SLA cancellation deadline expiration for late WARRANTY tickets (BL-101)', async () => {
      // Created 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const mockTicket: TicketSummary = {
        id: 'TICKET-002',
        title: 'Warranty service request',
        description: 'Server failed within warranty period',
        category: 'WARRANTY',
        status: 'OPEN',
        priority: 'MEDIUM',
        clientId: 'client-1',
        tenantId: 'tenant-1',
        createdAt: twoHoursAgo,
        updatedAt: twoHoursAgo,
      };

      vi.mocked(mockApiClient.getTicket!).mockResolvedValue(mockTicket);

      const report = await agent.triageTicket('TICKET-002');

      expect(report.slaStatus.withinCancellationWindow).toBe(false);
      expect(report.internalTechnicianNote).toContain('SLA Window Expired');
    });

    it('should recommend Tier 2 escalation for unworked CRITICAL tickets past 10m (BL-104)', async () => {
      // Created 15 minutes ago
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const mockTicket: TicketSummary = {
        id: 'TICKET-003',
        title: 'Core Switch Outage',
        description: 'Network unreachable for entire floor',
        category: 'SERVICE_OUTAGE',
        status: 'OPEN',
        priority: 'CRITICAL',
        clientId: 'client-1',
        tenantId: 'tenant-1',
        createdAt: fifteenMinutesAgo,
        updatedAt: fifteenMinutesAgo,
      };

      vi.mocked(mockApiClient.getTicket!).mockResolvedValue(mockTicket);

      const report = await agent.triageTicket('TICKET-003');

      expect(report.slaStatus.recommendedEscalation).toBe(true);
      expect(report.recommendedActions).toContain(
        'Escalate ticket to Tier-2 engineering per SLA escalation rule (BL-104).'
      );
    });
  });

  describe('generateQbrReport', () => {
    it('should calculate letter grades, operational risks, and roadmap (BL-601)', async () => {
      const mockHealth: ClientHealthReport = {
        tenantId: 'tenant-1',
        tenantName: 'Acme Corporation',
        score: 68,
        ticketHealth: 60,
        hardwareHealth: 75,
        securityHealth: 70,
        openTicketCount: 5,
        criticalTicketCount: 2,
        outdatedDeviceCount: 3,
        slaBreachRisk: true,
        recommendations: ['Update OS patches'],
      };

      const mockEquipment: EquipmentSlot[] = [
        {
          id: 'slot-1',
          subscriptionId: 'sub-1',
          slotIndex: 1,
          status: 'ACTIVE',
          deviceName: 'WS-01',
          tenantId: 'tenant-1',
        },
        {
          id: 'slot-2',
          subscriptionId: 'sub-1',
          slotIndex: 2,
          status: 'OFFLINE',
          deviceName: 'WS-02',
          tenantId: 'tenant-1',
        },
      ];

      const mockTickets: TicketSummary[] = [
        {
          id: 't-1',
          title: 'Database connection failed',
          description: 'Cannot reach DB',
          category: 'SERVICE_OUTAGE',
          status: 'OPEN',
          priority: 'CRITICAL',
          clientId: 'client-1',
          tenantId: 'tenant-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      vi.mocked(mockApiClient.getClientHealth!).mockResolvedValue(mockHealth);
      vi.mocked(mockApiClient.getClientEquipment!).mockResolvedValue(mockEquipment);
      vi.mocked(mockApiClient.listTickets!).mockResolvedValue(mockTickets);

      const qbr = await agent.generateQbrReport('tenant-1', 'Acme Corporation');

      expect(qbr.letterGrade).toBe('D');
      expect(qbr.deviceStats.total).toBe(2);
      expect(qbr.deviceStats.online).toBe(1);
      expect(qbr.deviceStats.offline).toBe(1);
      expect(qbr.topOperationalRisks.some((r) => r.includes('below SLA threshold'))).toBe(true);
      expect(qbr.strategicRoadmap.length).toBeGreaterThanOrEqual(3);
    });
  });
});
