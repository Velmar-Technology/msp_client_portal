#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { MspApiClient } from './client/MspApiClient.js';
import { registerTicketTools } from './tools/ticketTools.js';
import { registerRmmTools } from './tools/rmmTools.js';
import { registerEquipmentTools } from './tools/equipmentTools.js';
import { registerSecurityTools } from './tools/securityTools.js';
import { registerRemediationTools } from './tools/remediationTools.js';
import { registerLocalHostTools } from './tools/localHostTools.js';
import { registerAuthzTools } from './tools/authzTools.js';
import { registerMspResources } from './resources/mspResources.js';
import { registerMspPrompts } from './prompts/mspPrompts.js';

// Load environment variables (.env)
dotenv.config();

/**
 * Resolves the backend API base URL.
 * Priority: MSP_SERVER_URL (server root, e.g. http://localhost:3001 — the
 * `/api/v1` suffix is appended automatically) > MSP_API_URL (full API base,
 * kept for backward compatibility) > local default.
 */
function resolveApiUrl(): string {
  const serverUrl = process.env.MSP_SERVER_URL?.replace(/\/+$/, '');
  if (serverUrl) {
    return serverUrl.endsWith('/api/v1') ? serverUrl : `${serverUrl}/api/v1`;
  }
  return process.env.MSP_API_URL || 'http://localhost:3001/api/v1';
}

const apiUrl = resolveApiUrl();
const apiToken = (process.env.MSP_API_KEY || process.env.MSP_API_TOKEN || '').trim();
const tenantId = process.env.MSP_TENANT_ID;

if (!apiToken) {
  console.error('[MSP MCP Server Configuration Error]: MSP_API_KEY is required to authenticate requests. Please configure MSP_API_KEY in mcp_config.json or your environment.');
  process.exit(1);
}

// Create the MCP Server
const server = new McpServer({
  name: 'msp-support-server',
  version: '1.0.0',
});

// Initialize the API client adapter
const apiClient = new MspApiClient({
  apiUrl,
  apiToken,
  tenantId,
});

// Register Tools, Resources & Prompts (All routed via Backend API, msp-agent tunnel & Host tools)
registerTicketTools(server, apiClient);
registerRmmTools(server, apiClient);
registerEquipmentTools(server, apiClient);
registerSecurityTools(server);
registerRemediationTools(server);
registerLocalHostTools(server);
registerAuthzTools(server, apiClient);
registerMspResources(server, apiClient);
registerMspPrompts(server);

// Start the stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MSP MCP Server] Started and listening on stdio transport. Backend API: ${apiUrl}`);
}

main().catch((error) => {
  console.error('[MSP MCP Server Fatal Error]:', error);
  process.exit(1);
});
