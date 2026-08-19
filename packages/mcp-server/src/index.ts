#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import dotenv from 'dotenv';
import { MspApiClient } from './client/MspApiClient.js';
import { registerTicketTools } from './tools/ticketTools.js';
import { registerRmmTools } from './tools/rmmTools.js';
import { registerEquipmentTools } from './tools/equipmentTools.js';
import { registerLocalHostTools } from './tools/localHostTools.js';
import { registerSecurityTools } from './tools/securityTools.js';
import { registerRemediationTools } from './tools/remediationTools.js';
import { registerMspResources } from './resources/mspResources.js';
import { registerMspPrompts } from './prompts/mspPrompts.js';

// Load environment variables (.env)
dotenv.config();

const apiUrl = process.env.MSP_API_URL || 'http://localhost:3001/api/v1';
const apiToken = process.env.MSP_API_TOKEN || '';
const tenantId = process.env.MSP_TENANT_ID;

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

// Register Tools, Resources & Prompts
registerTicketTools(server, apiClient);
registerRmmTools(server, apiClient);
registerEquipmentTools(server, apiClient);
registerLocalHostTools(server);
registerSecurityTools(server);
registerRemediationTools(server);
registerMspResources(server, apiClient);
registerMspPrompts(server);

// Start the stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MSP MCP Server] Started and listening on stdio transport.');
}

main().catch((error) => {
  console.error('[MSP MCP Server Fatal Error]:', error);
  process.exit(1);
});
