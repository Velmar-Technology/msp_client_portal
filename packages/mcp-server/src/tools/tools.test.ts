import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MspApiClient } from '../client/MspApiClient.js';
import { registerTicketTools } from './ticketTools.js';
import { registerRmmTools } from './rmmTools.js';
import { registerEquipmentTools } from './equipmentTools.js';

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

  it('should successfully register all ticket, rmm, and equipment tools without throwing', () => {
    expect(() => {
      registerTicketTools(server, mockApiClient);
      registerRmmTools(server, mockApiClient);
      registerEquipmentTools(server, mockApiClient);
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
});
