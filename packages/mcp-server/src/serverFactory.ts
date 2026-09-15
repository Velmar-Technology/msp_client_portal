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
import { registerBillingTools } from './tools/billingTools.js';
import { registerDomainTools } from './tools/domainTools.js';
import { registerEmailTools } from './tools/emailTools.js';
import { registerNetworkTools } from './tools/networkTools.js';
import { registerStorageTools } from './tools/storageTools.js';
import { registerSentinelTools } from './tools/sentinelTools.js';
import { registerCafTools } from './tools/cafTools.js';
import { registerMspResources } from './resources/mspResources.js';
import { registerMspPrompts } from './prompts/mspPrompts.js';

/**
 * Server profile modes for least-privilege tool isolation.
 * - 'caf-education': Isolated profile exposing ONLY educational CAF & privacy tools. Zero access to IT/RMM/PowerShell.
 * - 'msp-support': Traditional MSP IT operations, ticketing, RMM, and device management.
 * - 'all': Unified profile for administrator oversight and debugging.
 */
export type McpServerProfile = 'all' | 'msp-support' | 'caf-education';

/**
 * Options for configuring McpServer instance creation.
 */
export interface CreateMcpServerOptions {
  profile?: McpServerProfile;
}

/**
 * Creates and initializes a fully configured McpServer instance according to
 * the selected profile, strictly isolating administrative MSP tools from academic CAF tools.
 *
 * @param apiClient - Configured MspApiClient instance (optional if in 'caf-education' profile)
 * @param options - Server profile and configuration options
 * @returns Initialized McpServer instance
 */
export function createMspMcpServer(
  apiClient?: MspApiClient,
  options: CreateMcpServerOptions | McpServerProfile = 'all'
): McpServer {
  const profile: McpServerProfile =
    typeof options === 'string'
      ? options
      : options.profile ||
        (process.env.MCP_PROFILE as McpServerProfile) ||
        'all';

  const isCaf = profile === 'caf-education' || profile === 'all';
  const isMsp = profile === 'msp-support' || profile === 'all';

  const serverName =
    profile === 'caf-education'
      ? 'caf-education-server'
      : profile === 'msp-support'
      ? 'msp-support-server'
      : 'msp-unified-server';

  const server = new McpServer({
    name: serverName,
    version: '1.12.0',
  });

  // 1. Register CAF Educational Tools (Least Privilege Isolation)
  if (isCaf) {
    registerCafTools(server);
  }

  // 2. Register MSP Administrative & IT Support Tools
  if (isMsp) {
    if (apiClient) {
      registerTicketTools(server, apiClient);
      registerRmmTools(server, apiClient);
      registerEquipmentTools(server, apiClient);
      registerAuthzTools(server, apiClient);
      registerUserTools(server, apiClient);
      registerBillingTools(server, apiClient);
      registerDomainTools(server, apiClient);
      registerEmailTools(server, apiClient);
      registerSentinelTools(server, apiClient);
      registerMspResources(server, apiClient);
    }
    registerSecurityTools(server);
    registerRemediationTools(server);
    registerLocalHostTools(server);
    registerNetworkTools(server);
    registerStorageTools(server);
    registerMspPrompts(server);
  }

  return server;
}
