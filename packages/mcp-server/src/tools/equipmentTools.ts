import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

export function registerEquipmentTools(server: McpServer, apiClient: MspApiClient) {
  // 0. Tool: msp_list_clients
  server.tool(
    'msp_list_clients',
    'List all active client tenants, accounts, primary contacts, plans, and aggregated device status overview',
    {
      status: z.string().optional().describe('Filter by subscription status (e.g. ACTIVE, EXPIRING, EXPIRED)'),
      search: z.string().optional().describe('Search query matching client name, tenant name, or email'),
    },
    async ({ status, search }) => {
      try {
        const clients = await apiClient.listClients({ status, search });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(clients, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to list clients: ${err.message}` }],
        };
      }
    }
  );

  // 1. Tool: msp_get_client_equipment
  server.tool(
    'msp_get_client_equipment',
    'List all registered equipment, device slots, serial numbers, and activation status for a client tenant',
    {
      tenantId: z.string().uuid().optional().describe('Tenant / Client UUID (optional if configured in environment)'),
    },
    async ({ tenantId }) => {
      try {
        const slots = await apiClient.getClientEquipment(tenantId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(slots, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch client equipment: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_get_client_health
  server.tool(
    'msp_get_client_health',
    'Calculate composite client health score (BL-501) across tickets (40%), hardware (30%), and security (30%)',
    {
      tenantId: z.string().uuid().describe('The UUID of the tenant / client company to evaluate'),
    },
    async ({ tenantId }) => {
      try {
        const health = await apiClient.getClientHealth(tenantId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to evaluate client health: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_get_device_components
  server.tool(
    'msp_get_device_components',
    'Get exhaustive hardware components, subsystem load, memory, disk capacity, security patch health, and maintenance status for a client device',
    {
      identifier: z.string().describe('Equipment UUID, serial number (e.g. SN-B3MMEG9BRE), or hostname (e.g. WS-00981)'),
    },
    async ({ identifier }) => {
      try {
        const details = await apiClient.getDeviceComponents(identifier);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to get device component details: ${err.message}` }],
        };
      }
    }
  );
}
