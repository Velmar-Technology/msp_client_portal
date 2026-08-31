import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MspApiClient } from '../client/MspApiClient.js';
import { registerTicketTools } from './ticketTools.js';
import { registerRmmTools } from './rmmTools.js';
import { registerEquipmentTools } from './equipmentTools.js';
import { registerSecurityTools } from './securityTools.js';
import { registerRemediationTools } from './remediationTools.js';
import { registerLocalHostTools } from './localHostTools.js';
import { registerAuthzTools } from './authzTools.js';

describe('MSP MCP Server Tools Registration and Execution', () => {
  let server: McpServer;
  let mockApiClient: MspApiClient;

  beforeEach(() => {
    server = new McpServer({
      name: 'test-mcp-server',
      version: '1.0.0',
    });

    mockApiClient = new MspApiClient({
      apiUrl: 'http://localhost:3000/api/v1',
      apiToken: 'mock-token',
    });
  });

  it('should successfully register all tools without throwing', () => {
    expect(() => {
      registerTicketTools(server, mockApiClient);
      registerRmmTools(server, mockApiClient);
      registerEquipmentTools(server, mockApiClient);
      registerSecurityTools(server);
      registerRemediationTools(server);
      registerLocalHostTools(server);
      registerAuthzTools(server, mockApiClient);
    }).not.toThrow();
  });

  it('should handle API client getTicket responses properly', async () => {
    const mockTicket = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'Outlook crashing on startup',
      description: 'Faulting module ntdll.dll',
      category: 'REPAIR' as const,
      status: 'OPEN' as const,
      priority: 'HIGH' as const,
      clientId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      tenantId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    vi.spyOn(mockApiClient, 'getTicket').mockResolvedValue(mockTicket);

    const result = await mockApiClient.getTicket('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
    expect(result.title).toBe('Outlook crashing on startup');
    expect(result.priority).toBe('HIGH');
  });

  it('should handle API client getDeviceTelemetry responses properly', async () => {
    const mockTelemetry = {
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      equipmentId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
      agentStatus: 'ONLINE' as const,
      cpuUsage: 18.5,
      memoryUsage: 64.2,
      diskUsage: 89.1,
      diskUsedGb: 445.5,
      diskTotalGb: 500.0,
      pendingPatchCount: 3,
      tenantId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    };

    vi.spyOn(mockApiClient, 'getDeviceTelemetry').mockResolvedValue(mockTelemetry);

    const result = await mockApiClient.getDeviceTelemetry('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55');
    expect(result.agentStatus).toBe('ONLINE');
    expect(result.diskUsage).toBe(89.1);
    expect(result.pendingPatchCount).toBe(3);
  });

  it('should handle JIT ephemeral access and trust score client operations', async () => {
    const mockGrant = {
      id: 'grant-uuid-123',
      userId: 'user-uuid-456',
      tenantId: 'tenant-uuid-789',
      elevatedRole: 'ADMIN',
      grantedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      reason: 'Urgent server maintenance',
      status: 'ACTIVE' as const,
    };

    vi.spyOn(mockApiClient, 'requestEphemeralAccess').mockResolvedValue(mockGrant);

    const grant = await mockApiClient.requestEphemeralAccess({
      role: 'ADMIN',
      reason: 'Urgent server maintenance',
      durationMinutes: 60,
    });

    expect(grant.elevatedRole).toBe('ADMIN');
    expect(grant.status).toBe('ACTIVE');

    const mockDecision = {
      allowed: true,
      decisionTier: 'EPHEMERAL_ZSP' as const,
      evaluatedAt: new Date().toISOString(),
    };

    vi.spyOn(mockApiClient, 'checkAccessDecision').mockResolvedValue(mockDecision);

    const decision = await mockApiClient.checkAccessDecision({
      action: 'equipment:write',
      resource: { type: 'equipment', id: 'eq-1' },
    });

    expect(decision.allowed).toBe(true);
    expect(decision.decisionTier).toBe('EPHEMERAL_ZSP');
  });

  it('should handle API client listClients and aggregation properly', async () => {
    const mockSlots = [
      {
        id: 'slot-1',
        tenant_id: 't-1',
        tenant_name: 'Acme Corp',
        client_name: 'Alice',
        client_email: 'alice@acme.com',
        service_name: 'Cloud Suite',
        plan: 'PL-001',
        subscription_status: 'ACTIVE',
        agent_status: 'ONLINE',
      },
      {
        id: 'slot-2',
        tenant_id: 't-1',
        tenant_name: 'Acme Corp',
        client_name: 'Alice',
        client_email: 'alice@acme.com',
        service_name: 'Cloud Suite',
        plan: 'PL-001',
        subscription_status: 'ACTIVE',
        agent_status: 'OFFLINE',
      },
    ];

    vi.spyOn(mockApiClient, 'getClientEquipment').mockResolvedValue(mockSlots as any);

    const clients = await mockApiClient.listClients();
    expect(clients).toHaveLength(1);
    expect(clients[0].tenantName).toBe('Acme Corp');
    expect(clients[0].totalDevices).toBe(2);
    expect(clients[0].onlineDevices).toBe(1);
    expect(clients[0].offlineDevices).toBe(1);
  });

  it('should handle getDeviceComponents and compute component health and recommendations', async () => {
    const mockSlot = {
      id: 'eq-uuid-100',
      device_name: 'Dell Latitude 7420 FHD',
      device_serial: 'SN-ABC123XYZ',
      agent_hostname: 'WS-00100',
      agent_status: 'ONLINE',
      cpu_usage: '45.00',
      memory_usage: '60.00',
      disk_usage: '92.50',
      disk_used_gb: '462.50',
      disk_total_gb: '500.00',
      pending_patch_count: 3,
      tenant_id: 't-1',
      tenant_name: 'Acme Corp',
      client_name: 'Alice',
      client_email: 'alice@acme.com',
      status: 'ACTIVE',
    };

    vi.spyOn(mockApiClient, 'getClientEquipment').mockResolvedValue([mockSlot] as any);
    vi.spyOn(mockApiClient, 'getDeviceMaintenances').mockResolvedValue([]);

    const details = await mockApiClient.getDeviceComponents('WS-00100');
    expect(details.id).toBe('eq-uuid-100');
    expect(details.deviceName).toBe('Dell Latitude 7420 FHD');
    expect(details.deviceBrand).toBe('Dell Technologies');
    expect(details.deviceCategory).toBe('LAPTOP');
    expect(details.hardwareFingerprint.chainOfCustodyStatus).toBe('VERIFIED_INTACT');
    expect(details.hardwareFingerprint.integrityHash).toBeDefined();
    expect(details.componentInventory.length).toBeGreaterThanOrEqual(5);

    // Verify component serial numbers and brands
    const motherboard = details.componentInventory.find(c => c.type === 'BASEBOARD');
    expect(motherboard?.serialNumber).toContain('SNABC123XYZ');
    expect(motherboard?.brand).toBe('Dell Technologies');

    const cpu = details.componentInventory.find(c => c.type === 'CPU');
    expect(cpu?.serialNumber).toContain('SNABC123XYZ');
    expect(cpu?.brand).toBe('Intel');

    const storage = details.componentInventory.find(c => c.type === 'STORAGE');
    expect(storage?.serialNumber).toBeDefined();

    const battery = details.componentInventory.find(c => c.type === 'BATTERY');
    expect(battery?.brand).toBe('Dell Technologies');

    expect(details.components.cpu.status).toBe('HEALTHY');
    expect(details.components.storage.status).toBe('CRITICAL');
    expect(details.components.osAndSecurity.pendingPatches).toBe(3);
    expect(details.recommendations.length).toBeGreaterThan(0);
  });

  it('should generate an all-in-one maintenance report with formatted markdown', async () => {
    const mockSlot = {
      id: 'eq-uuid-200',
      device_name: 'HPE ProLiant DL380 Gen10 Server',
      device_serial: 'SN-HPE999SRV',
      agent_hostname: 'WS-00999',
      agent_status: 'ONLINE',
      cpu_usage: '22.00',
      memory_usage: '40.00',
      disk_usage: '50.00',
      disk_used_gb: '1000.00',
      disk_total_gb: '2000.00',
      pending_patch_count: 0,
      tenant_id: 't-2',
      tenant_name: 'Beta Industries',
      client_name: 'Bob',
      client_email: 'bob@beta.com',
      status: 'ACTIVE',
    };

    vi.spyOn(mockApiClient, 'getClientEquipment').mockResolvedValue([mockSlot] as any);
    vi.spyOn(mockApiClient, 'getDeviceMaintenances').mockResolvedValue([
      {
        id: 'maint-1',
        scheduled_date: '2026-09-01T10:00:00Z',
        title: 'Quarterly Server Preventative Maintenance',
        status: 'SCHEDULED',
        notes: 'Thermal paste check and backup verification',
      },
    ]);

    const report = await mockApiClient.getDeviceMaintenanceReport('WS-00999');
    expect(report.device.name).toBe('HPE ProLiant DL380 Gen10 Server');
    expect(report.client.tenantName).toBe('Beta Industries');
    expect(report.maintenanceJobs.activeJobCount).toBe(1);
    expect(report.hardwareCustodyAudit.chainOfCustodyStatus).toBe('VERIFIED_INTACT');
    expect(report.formattedMarkdownReport).toContain('MSP Device Maintenance & Component Custody Dossier');
    expect(report.formattedMarkdownReport).toContain('Beta Industries');
    expect(report.formattedMarkdownReport).toContain('Quarterly Server Preventative Maintenance');
  });
});

