import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { MspApiClient } from './client/MspApiClient.js';
import { registerTicketTools } from './tools/ticketTools.js';
import { registerRmmTools } from './tools/rmmTools.js';
import { registerEquipmentTools } from './tools/equipmentTools.js';
import { registerSecurityTools } from './tools/securityTools.js';
import { registerRemediationTools } from './tools/remediationTools.js';
import { registerLocalHostTools } from './tools/localHostTools.js';
import { registerAuthzTools } from './tools/authzTools.js';
import { registerUserTools } from './tools/userTools.js';
import { registerMspResources } from './resources/mspResources.js';
import { registerMspPrompts } from './prompts/mspPrompts.js';

/**
 * Creates and initializes a fully configured McpServer instance with all
 * tools, resources, and prompts registered.
 *
 * @param apiClient - Configured MspApiClient instance
 * @returns Initialized McpServer instance
 */
export function createMspMcpServer(apiClient: MspApiClient): McpServer {
  const server = new McpServer({
    name: 'msp-support-server',
    version: '1.8.4',
  });

  registerTicketTools(server, apiClient);
  registerRmmTools(server, apiClient);
  registerEquipmentTools(server, apiClient);
  registerSecurityTools(server);
  registerRemediationTools(server);
  registerLocalHostTools(server);
  registerAuthzTools(server, apiClient);
  registerUserTools(server, apiClient);
  registerMspResources(server, apiClient);
  registerMspPrompts(server);

  return server;
}
