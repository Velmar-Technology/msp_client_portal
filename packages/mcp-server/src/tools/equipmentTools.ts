import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

export function registerEquipmentTools(server: McpServer, apiClient: MspApiClient) {
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
}
