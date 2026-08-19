import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

export function registerRmmTools(server: McpServer, apiClient: MspApiClient) {
  // 1. Tool: msp_get_device_telemetry
  server.tool(
    'msp_get_device_telemetry',
    'Fetch real-time RMM telemetry (CPU, RAM, Disk usage, Agent online status, and pending patch count) for an equipment/asset',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device slot'),
    },
    async ({ equipmentId }) => {
      try {
        const telemetry = await apiClient.getDeviceTelemetry(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(telemetry, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch device telemetry: ${err.message}` }],
        };
      }
    }
  );

  // 2. Tool: msp_list_device_patches
  server.tool(
    'msp_list_device_patches',
    'List operating system patches, security updates, and installation status for a device',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device slot'),
      status: z.enum(['PENDING', 'INSTALLED', 'FAILED']).optional().describe('Filter by patch status'),
    },
    async ({ equipmentId, status }) => {
      try {
        const patches = await apiClient.listDevicePatches(equipmentId, status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(patches, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch device patches: ${err.message}` }],
        };
      }
    }
  );

  // 3. Tool: msp_get_device_maintenances
  server.tool(
    'msp_get_device_maintenances',
    'Fetch scheduled and past preventative maintenance records for a device',
    {
      equipmentId: z.string().uuid().describe('The UUID of the equipment/device slot'),
    },
    async ({ equipmentId }) => {
      try {
        const maintenances = await apiClient.getDeviceMaintenances(equipmentId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(maintenances, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Failed to fetch maintenance history: ${err.message}` }],
        };
      }
    }
  );
}
