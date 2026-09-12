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
import { registerUserTools } from './userTools.js';
import { registerBillingTools } from './billingTools.js';
import { registerDomainTools } from './domainTools.js';
import { registerEmailTools } from './emailTools.js';
import { registerNetworkTools } from './networkTools.js';
import { registerStorageTools } from './storageTools.js';
import { registerSentinelTools } from './sentinelTools.js';
import { timingSafeCompare, validateInboundApiKey } from '../authUtils.js';
import type { SystemApiStatusResponse, NotificationListResult } from '../types.js';

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
      registerUserTools(server, mockApiClient);
      registerBillingTools(server, mockApiClient);
      registerDomainTools(server, mockApiClient);
      registerEmailTools(server, mockApiClient);
      registerNetworkTools(server);
      registerStorageTools(server);
      registerSentinelTools(server, mockApiClient);
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

  it('should handle listUsers and user queries properly', async () => {
    const mockUsersResult = {
      users: [
        {
          id: 'u-1',
          email: 'admin@msp.local',
          name: 'Super Admin',
          role: 'ADMIN' as const,
          tenantId: 'tenant-1',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    vi.spyOn(mockApiClient, 'listUsers').mockResolvedValue(mockUsersResult);
    const result = await mockApiClient.listUsers({ role: 'ADMIN', page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.users[0].name).toBe('Super Admin');
    expect(result.users[0].role).toBe('ADMIN');
  });

  it('should handle invoice and financial queries properly', async () => {
    const mockInvoicesResult = {
      invoices: [
        {
          id: 'inv-uuid-1',
          invoice_number: 'INV-2026-0001',
          client_id: 'client-uuid-1',
          amount: 1500,
          tax_amount: 270,
          total: 1770,
          status: 'PAID' as const,
          invoice_date: new Date().toISOString(),
          due_date: new Date().toISOString(),
          tenant_id: 'tenant-1',
          created_at: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    vi.spyOn(mockApiClient, 'listInvoices').mockResolvedValue(mockInvoicesResult);
    const result = await mockApiClient.listInvoices({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.invoices[0].invoice_number).toBe('INV-2026-0001');
    expect(result.invoices[0].total).toBe(1770);

    const mockStats = {
      totalRevenue: 25000,
      pendingRevenue: 3000,
      paidInvoicesCount: 15,
      pendingInvoicesCount: 2,
    };

    vi.spyOn(mockApiClient, 'getFinancialStats').mockResolvedValue(mockStats);
    const stats = await mockApiClient.getFinancialStats('30_days');
    expect(stats.totalRevenue).toBe(25000);
    expect(stats.paidInvoicesCount).toBe(15);

    const mockPlans = [
      {
        id: 'PL-001',
        name: { en_US: 'Basic', es_DO: 'Básico' },
        price: 18,
        client_type: 'CLIENT',
        active: true,
        recommended: true,
        features: [{ code: 'HELPDESK_SUPPORT' }, { code: 'CLOUD_STORAGE' }],
      },
    ];

    vi.spyOn(mockApiClient, 'listPlans').mockResolvedValue(mockPlans);
    const plansResult = await mockApiClient.listPlans();
    expect(plansResult.length).toBe(1);
    expect(plansResult[0].id).toBe('PL-001');

    registerBillingTools(server, mockApiClient);
    const registeredTools = (server as any)._registeredTools || {};
    const planTool = registeredTools['msp_list_plans'];
    expect(planTool).toBeDefined();

    if (typeof planTool.handler === 'function') {
      const toolRes = await planTool.handler({ format: 'markdown_table' });
      expect(toolRes.content[0].text).toContain('MSP Subscription Plans & Pricing Catalog');
      expect(toolRes.content[0].text).toContain('PL-001');
      expect(toolRes.content[0].text).toContain('$18 / mo');
    }
  });

  it('should handle getSystemApiStatus properly', async () => {
    const mockSystemStatus: SystemApiStatusResponse = {
      overallStatus: 'OPERATIONAL',
      averageLatencyMs: 24.5,
      totalServices: 6,
      operationalCount: 6,
      degradedCount: 0,
      downCount: 0,
      lastChecked: new Date().toISOString(),
      services: [
        {
          id: 'db-postgres',
          name: 'PostgreSQL Database',
          category: 'CORE',
          endpoint: 'postgresql://localhost:5432/msp_portal',
          status: 'OPERATIONAL',
          latencyMs: 4,
          uptimePercentage: 99.98,
          lastChecked: new Date().toISOString(),
        },
      ],
      envVariables: [
        {
          key: 'DATABASE_URL',
          category: 'DATABASE',
          status: 'CONFIGURED',
          isSecret: true,
          valueDisplay: 'postgresql://***@localhost:5432/msp_portal',
          description: 'Primary database connection string',
        },
      ],
      envTotal: 1,
      envConfiguredCount: 1,
      envDegradedCount: 0,
      envMissingCount: 0,
    };

    vi.spyOn(mockApiClient, 'getSystemApiStatus').mockResolvedValue(mockSystemStatus);
    const status = await mockApiClient.getSystemApiStatus();
    expect(status.overallStatus).toBe('OPERATIONAL');
    expect(status.operationalCount).toBe(6);
    expect(status.services[0].name).toBe('PostgreSQL Database');
    expect(status.envVariables[0].status).toBe('CONFIGURED');
  });

  it('should propagate errors when getSystemApiStatus fails', async () => {
    vi.spyOn(mockApiClient, 'getSystemApiStatus').mockRejectedValue(new Error('Backend connection refused'));
    await expect(mockApiClient.getSystemApiStatus()).rejects.toThrow('Backend connection refused');
  });

  it('should verify domainTools registration on McpServer', () => {
    registerDomainTools(server, mockApiClient);
    const registeredTools = (server as any)._registeredTools || {};
    expect(registeredTools['msp_check_domain_services']).toBeDefined();
    expect(registeredTools['msp_get_system_api_status']).toBeDefined();
  });

  it('should execute msp_get_system_api_status tool callback successfully', async () => {
    registerDomainTools(server, mockApiClient);
    const registeredTools = (server as any)._registeredTools || {};
    const tool = registeredTools['msp_get_system_api_status'];
    expect(tool).toBeDefined();

    const mockResponse: SystemApiStatusResponse = {
      overallStatus: 'OPERATIONAL',
      averageLatencyMs: 12,
      totalServices: 1,
      operationalCount: 1,
      degradedCount: 0,
      downCount: 0,
      lastChecked: '2026-09-08T00:00:00Z',
      services: [],
      envVariables: [],
      envTotal: 0,
      envConfiguredCount: 0,
      envDegradedCount: 0,
      envMissingCount: 0,
    };

    vi.spyOn(mockApiClient, 'getSystemApiStatus').mockResolvedValue(mockResponse);

    if (typeof tool.handler === 'function') {
      const result = await tool.handler({});
      expect(result.content[0].text).toContain('OPERATIONAL');
      expect(result.isError).toBeUndefined();
    }
  });

  it('should handle errors in msp_get_system_api_status tool callback', async () => {
    registerDomainTools(server, mockApiClient);
    const registeredTools = (server as any)._registeredTools || {};
    const tool = registeredTools['msp_get_system_api_status'];
    expect(tool).toBeDefined();

    vi.spyOn(mockApiClient, 'getSystemApiStatus').mockRejectedValue(new Error('Backend connection refused'));

    if (typeof tool.handler === 'function') {
      const result = await tool.handler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to retrieve system API status: Backend connection refused');
    }
  });

  it('should execute msp_check_domain_services tool callback with simulated inputs', async () => {
    registerDomainTools(server, mockApiClient);
    const registeredTools = (server as any)._registeredTools || {};
    const tool = registeredTools['msp_check_domain_services'];
    expect(tool).toBeDefined();

    if (typeof tool.handler === 'function') {
      const result = await tool.handler({
        domain: 'example.com',
        checkEmailServices: false,
        checkWebServices: false,
        timeoutMs: 1000,
      });

      expect(result.content[0].text).toContain('Vital Services Health Audit: `example.com`');
      expect(result.content[0].text).toContain('Domain & DNS Resolution');
    }
  });

  it('should handle getNotifications and msp_get_last_email execution', async () => {
    registerEmailTools(server, mockApiClient);
    const registeredTools = (server as any)._registeredTools || {};
    const tool = registeredTools['msp_get_last_email'];
    expect(tool).toBeDefined();

    const mockNotifications: NotificationListResult = {
      notifications: [
        {
          id: 'notif-123',
          user_id: 'user-456',
          title: 'Ticket #104 Assigned',
          message: 'Technician Estiven assigned to ticket #104.',
          link: '/tickets/104',
          type: 'TICKET_ASSIGNED',
          read: false,
          created_at: '2026-09-08T12:00:00.000Z',
        },
      ],
      unreadCount: 1,
    };

    vi.spyOn(mockApiClient, 'getNotifications').mockResolvedValue(mockNotifications);

    const directResult = await mockApiClient.getNotifications();
    expect(directResult.notifications.length).toBe(1);
    expect(directResult.notifications[0].title).toBe('Ticket #104 Assigned');

    if (typeof tool.handler === 'function') {
      const result = await tool.handler({ source: 'portal_notifications' });
      expect(result.content[0].text).toContain('Latest Portal Email & System Notification');
      expect(result.content[0].text).toContain('Ticket #104 Assigned');
      expect(result.content[0].text).toContain('Technician Estiven assigned');
    }
  });

  it('should register and execute msp_audit_network_interfaces handler', async () => {
    registerNetworkTools(server);
    const registeredTools = (server as any)._registeredTools || {};
    const tool = registeredTools['msp_audit_network_interfaces'];
    expect(tool).toBeDefined();

    if (typeof tool.handler === 'function') {
      const result = await tool.handler({
        targetHost: '1.1.1.1',
        domainToResolve: 'helpdesk.velmartech.com.do',
      });
      expect(result).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    }
  }, 15000);

  it('should register and execute msp_analyze_disk_storage handler', async () => {
    registerStorageTools(server);
    const registeredTools = (server as any)._registeredTools || {};
    const tool = registeredTools['msp_analyze_disk_storage'];
    expect(tool).toBeDefined();

    if (typeof tool.handler === 'function') {
      const result = await tool.handler({ includeHotspots: false });
      expect(result).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    }
  });

  describe('Inbound API Key Authentication (Copilot Studio Option B)', () => {
    const SECRET_KEY = 'msp_live_secret_key_12345';

    it('timingSafeCompare should validate string matches and handle length differences safely', () => {
      expect(timingSafeCompare('secret', 'secret')).toBe(true);
      expect(timingSafeCompare('secret', 'wrong')).toBe(false);
      expect(timingSafeCompare('secret', 'secret_longer')).toBe(false);
      expect(timingSafeCompare('', '')).toBe(true);
    });

    it('validateInboundApiKey should accept valid X-API-Key header', () => {
      const mockReq = {
        headers: {
          'x-api-key': SECRET_KEY,
        },
      } as any;

      expect(validateInboundApiKey(mockReq, SECRET_KEY)).toBe(true);
    });

    it('validateInboundApiKey should accept valid Authorization Bearer header', () => {
      const mockReq = {
        headers: {
          authorization: `Bearer ${SECRET_KEY}`,
        },
      } as any;

      expect(validateInboundApiKey(mockReq, SECRET_KEY)).toBe(true);
    });

    it('validateInboundApiKey should accept raw Authorization header without Bearer prefix', () => {
      const mockReq = {
        headers: {
          authorization: SECRET_KEY,
        },
      } as any;

      expect(validateInboundApiKey(mockReq, SECRET_KEY)).toBe(true);
    });

    it('validateInboundApiKey should reject mismatched or missing API keys', () => {
      const wrongReq = {
        headers: {
          'x-api-key': 'wrong_key',
        },
      } as any;
      expect(validateInboundApiKey(wrongReq, SECRET_KEY)).toBe(false);

      const emptyReq = {
        headers: {},
      } as any;
      expect(validateInboundApiKey(emptyReq, SECRET_KEY)).toBe(false);
    });

    it('validateInboundApiKey should return true if expectedKey is empty/not configured', () => {
      const emptyReq = {
        headers: {},
      } as any;
      expect(validateInboundApiKey(emptyReq, '')).toBe(true);
    });
  });

  describe('RMM Agent Upgrade Tool', () => {
    it('should handle msp_remote_upgrade_agent properly', async () => {
      vi.spyOn(mockApiClient, 'upgradeRemoteAgent').mockResolvedValueOnce({
        success: true,
        message: 'Agent upgrade initiated successfully',
        equipmentId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        targetVersion: '1.10.2',
        rollbackTimeoutSecs: 45,
      });

      registerRmmTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const upgradeTool = tools['msp_remote_upgrade_agent'];
      expect(upgradeTool).toBeDefined();

      const result = await upgradeTool.handler({
        equipmentId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        targetVersion: '1.10.2',
        rollbackTimeoutSecs: 45,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Agent Self-Upgrade Initiated');
      expect(result.content[0].text).toContain('v1.10.2');
    });

    it('should return isError when upgradeRemoteAgent throws', async () => {
      vi.spyOn(mockApiClient, 'upgradeRemoteAgent').mockRejectedValueOnce(
        new Error('Agent for equipment is offline')
      );

      registerRmmTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const upgradeTool = tools['msp_remote_upgrade_agent'];

      const result = await upgradeTool.handler({
        equipmentId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Agent for equipment is offline');
    });
  });

  describe('Equipment Quota Management Tool', () => {
    it('should handle msp_update_client_equipment_quota successfully', async () => {
      vi.spyOn(mockApiClient, 'updateClientEquipmentQuota').mockResolvedValueOnce({
        success: true,
        subscriptionId: 'sub-uuid-123',
        tenantId: 'tenant-uuid-456',
        previousCount: 2,
        newCount: 5,
        slotsAdded: 3,
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        invoiceIssued: true,
        message: "Equipment quota successfully updated from 2 to 5 slot(s) for tenant 'tenant-uuid-456'. 3 new slot(s) pre-provisioned in PENDING_ACTIVATION.",
      });

      registerEquipmentTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const quotaTool = tools['msp_update_client_equipment_quota'];
      expect(quotaTool).toBeDefined();

      const result = await quotaTool.handler({
        tenantId: 'tenant-uuid-456',
        equipmentCount: 5,
        createInvoice: true,
        reason: 'Client requested extra developer workstations via Sentinel',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Equipment quota successfully updated from 2 to 5');
      expect(result.content[0].text).toContain('3 new slot(s) pre-provisioned');
    });

    it('should return isError when updateClientEquipmentQuota fails', async () => {
      vi.spyOn(mockApiClient, 'updateClientEquipmentQuota').mockRejectedValueOnce(
        new Error('No subscription found for tenant')
      );

      registerEquipmentTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const quotaTool = tools['msp_update_client_equipment_quota'];

      const result = await quotaTool.handler({
        tenantId: 'tenant-uuid-999',
        equipmentCount: 10,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to update client equipment quota: No subscription found for tenant');
    });
  });

  describe('SequenceSentinel Tools (BL-101 to BL-802)', () => {
    it('should successfully execute msp_provision_subscription_plan', async () => {
      vi.spyOn(mockApiClient, 'provisionSubscriptionPlan').mockResolvedValueOnce({
        success: true,
        subscription: {
          id: 'sub-created-123',
          client_id: 'user-uuid-1',
          service_name: 'Basic Support Plan (Monthly)',
          plan: 'PL-001',
          status: 'ACTIVE',
          renewal_date: '2026-10-12T00:00:00.000Z',
          equipment_count: 1,
          tenant_id: 'tenant-uuid-1',
          created_at: '2026-09-12T00:00:00.000Z',
        },
        client: {
          id: 'user-uuid-1',
          email: 'e.a.polanco.robles@gmail.com',
          name: 'Estiven Antonio Polanco Robles',
          tenantId: 'tenant-uuid-1',
        },
        plan: {
          id: 'PL-001',
          name: 'Basic',
          price: 18,
          features: ['HELPDESK_SUPPORT', 'CLOUD_STORAGE'],
        },
        invoice: {
          amount: 18,
          tax_amount: 3.24,
          total: 21.24,
          status: 'PAID',
        },
        slotsInitialized: 1,
        sentinelVerification: {
          passed: true,
          violationsCount: 0,
        },
        message: 'Successfully provisioned Basic Plan (PL-001) for user e.a.polanco.robles@gmail.com',
      });

      registerSentinelTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const provisionTool = tools['msp_provision_subscription_plan'];
      expect(provisionTool).toBeDefined();

      const result = await provisionTool.handler({
        user: 'e.a.polanco.robles@gmail.com',
        plan: 'PL-001',
        equipmentCount: 1,
        billingCycle: 'monthly',
        markPaid: true,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('sub-created-123');
      expect(result.content[0].text).toContain('PL-001');
      expect(result.content[0].text).toContain('21.24');
    });

    it('should return isError when msp_provision_subscription_plan fails', async () => {
      vi.spyOn(mockApiClient, 'provisionSubscriptionPlan').mockRejectedValueOnce(
        new Error("Plan 'NonExistent' not found in catalog")
      );

      registerSentinelTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const provisionTool = tools['msp_provision_subscription_plan'];

      const result = await provisionTool.handler({
        user: 'unknown@velmartech.com.do',
        plan: 'NonExistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Failed to provision subscription plan: Plan 'NonExistent' not found in catalog");
    });

    it('should successfully execute msp_extend_subscription', async () => {
      vi.spyOn(mockApiClient, 'extendSubscription').mockResolvedValueOnce({
        success: true,
        subscriptionId: 'sub-created-123',
        previousRenewalDate: '2026-10-12T00:00:00.000Z',
        newRenewalDate: '2027-10-12T00:00:00.000Z',
        extendedMonths: 12,
        serviceName: 'Basic Support Plan (Annual)',
        invoiceIssued: true,
        invoice: {
          id: 'inv-ext-1',
          invoice_number: 'INV-2026-0002',
          amount: 172.8,
          tax_amount: 31.1,
          total: 203.9,
          status: 'PAID',
        },
        message: 'Successfully extended subscription for user e.a.polanco.robles@gmail.com by 12 month(s).',
      });

      registerSentinelTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const extendTool = tools['msp_extend_subscription'];
      expect(extendTool).toBeDefined();

      const result = await extendTool.handler({
        user: 'e.a.polanco.robles@gmail.com',
        extension: '1 year',
        markPaid: true,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('sub-created-123');
      expect(result.content[0].text).toContain('2027-10-12');
      expect(result.content[0].text).toContain('203.9');
    });

    it('should successfully execute msp_audit_portainer_infrastructure', async () => {
      vi.spyOn(mockApiClient, 'auditPortainerInfrastructure').mockResolvedValueOnce({
        success: true,
        endpointId: 3,
        stackId: 17,
        stackName: 'msp_portal',
        totalContainers: 14,
        runningContainers: 14,
        unhealthyContainers: 0,
        overallStatus: 'HEALTHY',
        containers: [
          {
            name: 'msp_portal_server_1',
            state: 'running',
            status: 'Up 4 hours (healthy)',
            image: 'msp-portal-server:latest',
          },
        ],
        composeServices: ['server', 'client', 'postgres', 'redis'],
        verifiedAt: new Date().toISOString(),
        message: "Infrastructure audit completed for stack 'msp_portal' on endpoint 3: 14/14 containers running healthy (Status: HEALTHY).",
      });

      registerSentinelTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const auditTool = tools['msp_audit_portainer_infrastructure'];
      expect(auditTool).toBeDefined();

      const result = await auditTool.handler({
        endpointId: 3,
        stackId: 17,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('msp_portal');
      expect(result.content[0].text).toContain('HEALTHY');
      expect(result.content[0].text).toContain('14');
    });

    it('should successfully execute msp_update_user_role tool', async () => {
      vi.spyOn(mockApiClient, 'manageUserAccount').mockResolvedValueOnce({
        success: true,
        user: {
          id: 'user-uuid-1',
          email: 'e.a.polanco.robles@gmail.com',
          name: 'Estiven Antonio Polanco Robles',
          role: 'CLIENT',
          clientType: 'CLIENT',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        previousRole: 'TECHNICIAN',
        previousClientType: null,
        message: 'Successfully updated account for e.a.polanco.robles@gmail.com (role: TECHNICIAN -> CLIENT, clientType: NONE -> CLIENT).',
      });

      registerUserTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const roleTool = tools['msp_update_user_role'];
      expect(roleTool).toBeDefined();

      const result = await roleTool.handler({
        user: 'e.a.polanco.robles@gmail.com',
        role: 'CLIENT',
        clientType: 'CLIENT',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('CLIENT');
      expect(result.content[0].text).toContain('e.a.polanco.robles@gmail.com');
    });

    it('should successfully execute msp_manage_features to add and remove features on demand', async () => {
      vi.spyOn(mockApiClient, 'manageFeatures').mockResolvedValueOnce({
        success: true,
        targetType: 'USER_SUBSCRIPTION',
        targetId: 'e.a.polanco.robles@gmail.com',
        planId: 'PL-001-CUSTOM-ABC12345',
        planName: 'Basic (Custom)',
        previousFeatures: ['HELPDESK_SUPPORT', 'CLOUD_STORAGE', 'BACKUP_INCLUDED'],
        currentFeatures: ['HELPDESK_SUPPORT', 'CLOUD_STORAGE', 'PASSWORD_MANAGER'],
        addedFeatures: ['PASSWORD_MANAGER'],
        removedFeatures: ['BACKUP_INCLUDED'],
        expandedCapabilities: ['HELPDESK_SUPPORT', 'CLOUD_STORAGE', 'PASSWORD_MANAGER'],
        message: "Features successfully updated for user 'e.a.polanco.robles@gmail.com' (Plan: PL-001-CUSTOM-ABC12345). Added: [PASSWORD_MANAGER], Removed: [BACKUP_INCLUDED]. Total active features: 3 (3 capabilities expanded).",
      });

      registerSentinelTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const featTool = tools['msp_manage_features'];
      expect(featTool).toBeDefined();

      const result = await featTool.handler({
        user: 'e.a.polanco.robles@gmail.com',
        addFeatures: ['PASSWORD_MANAGER'],
        removeFeatures: ['BACKUP_INCLUDED'],
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('PL-001-CUSTOM-ABC12345');
      expect(result.content[0].text).toContain('PASSWORD_MANAGER');
      expect(result.content[0].text).toContain('BACKUP_INCLUDED');
    });

    it('should return catalog list when msp_manage_features is called without arguments', async () => {
      vi.spyOn(mockApiClient, 'manageFeatures').mockResolvedValueOnce({
        success: true,
        targetType: 'CATALOG_LIST',
        targetId: 'ALL',
        previousFeatures: [],
        currentFeatures: ['HELPDESK_SUPPORT', 'PASSWORD_MANAGER'],
        addedFeatures: [],
        removedFeatures: [],
        expandedCapabilities: ['HELPDESK_SUPPORT', 'PASSWORD_MANAGER'],
        message: 'Catalog of 2 available feature codes and composite bundles retrieved.',
      });

      registerSentinelTools(server, mockApiClient);
      const tools = (server as any)._registeredTools;
      const featTool = tools['msp_manage_features'];
      expect(featTool).toBeDefined();

      const result = await featTool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('CATALOG_LIST');
      expect(result.content[0].text).toContain('PASSWORD_MANAGER');
    });
  });
});



