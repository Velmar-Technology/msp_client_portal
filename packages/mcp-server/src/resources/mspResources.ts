import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { MspApiClient } from '../client/MspApiClient.js';

export function registerMspResources(server: McpServer, apiClient: MspApiClient) {
  // 1. Resource: Ticket Live Context
  server.resource(
    'msp-ticket',
    new ResourceTemplate('msp://tickets/{ticketId}', { list: undefined }),
    async (uri, { ticketId }) => {
      try {
        const ticket = await apiClient.getTicket(String(ticketId));
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(ticket, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `Error loading ticket resource: ${err.message}`,
            },
          ],
        };
      }
    }
  );

  // 2. Resource: Device Telemetry Snapshot
  server.resource(
    'msp-device-telemetry',
    new ResourceTemplate('msp://devices/{equipmentId}/telemetry', { list: undefined }),
    async (uri, { equipmentId }) => {
      try {
        const telemetry = await apiClient.getDeviceTelemetry(String(equipmentId));
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(telemetry, null, 2),
            },
          ],
        };
      } catch (err: any) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: `Error loading telemetry resource: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
