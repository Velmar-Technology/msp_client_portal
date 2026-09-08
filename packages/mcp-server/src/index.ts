#!/usr/bin/env node
import http from 'http';
import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MspApiClient } from './client/MspApiClient.js';
import { createMspMcpServer } from './serverFactory.js';

// Load environment variables (.env)
dotenv.config();

/**
 * Resolves the backend API base URL.
 * Priority: MSP_SERVER_URL (server root, e.g. http://localhost:3001 — the
 * `/api/v1` suffix is appended automatically) > MSP_API_URL (full API base,
 * kept for backward compatibility) > local default.
 */
function resolveApiUrl(): string {
  let serverUrl = process.env.MSP_SERVER_URL?.trim().replace(/\/+$/, '');
  if (serverUrl) {
    if (!/^https?:\/\//i.test(serverUrl)) {
      serverUrl = `https://${serverUrl}`;
    }
    return serverUrl.endsWith('/api/v1') ? serverUrl : `${serverUrl}/api/v1`;
  }
  let apiUrl = process.env.MSP_API_URL?.trim().replace(/\/+$/, '');
  if (apiUrl) {
    if (!/^https?:\/\//i.test(apiUrl)) {
      apiUrl = `https://${apiUrl}`;
    }
    return apiUrl;
  }
  return 'http://localhost:3001/api/v1';
}

const apiUrl = resolveApiUrl();
const apiToken = (process.env.MSP_API_KEY || process.env.MSP_API_TOKEN || '').trim();
const tenantId = process.env.MSP_TENANT_ID;

if (!apiToken) {
  console.error('[MSP MCP Server Configuration Error]: MSP_API_KEY is required to authenticate requests. Please configure MSP_API_KEY in mcp_config.json or your environment.');
  process.exit(1);
}

// Initialize the API client adapter
const apiClient = new MspApiClient({
  apiUrl,
  apiToken,
  tenantId,
});

const isHttpMode = process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http';

/**
 * Main execution entry point. Launches the server in either:
 * - Stateless Streamable HTTP mode (2026-07-28 Spec) when --http or MCP_TRANSPORT=http is set.
 * - Stdio mode for local CLI, IDE subagents, and desktop clients.
 */
async function main(): Promise<void> {
  if (isHttpMode) {
    const port = Number(process.env.MCP_HTTP_PORT || process.env.MCP_PORT || 3005);
    const mcpServer = createMspMcpServer(apiClient);

    // SOTA 2026-07-28 Spec: Stateless Streamable HTTP Transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless request-response mode
    });

    await mcpServer.connect(transport);

    const httpServer = http.createServer(async (req, res) => {
      // CORS & standard headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Tenant-Id, X-User-Id');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'UP',
            server: 'msp-support-server',
            version: '1.8.4',
            spec: 'MCP 2026-07-28 (Stateless Streamable HTTP)',
            transport: 'streamable-http',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      if (url.pathname === '/mcp' || url.pathname === '/api/v1/mcp') {
        try {
          await transport.handleRequest(req, res);
        } catch (err: any) {
          console.error('[MSP MCP HTTP Transport Error]:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message || 'Internal MCP Server Error' }));
          }
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found', path: url.pathname }));
    });

    httpServer.listen(port, () => {
      console.log(`[MSP MCP Server] Stateless Streamable HTTP Server (2026-07-28 Spec) listening on http://0.0.0.0:${port}/mcp`);
      console.log(`[MSP MCP Server] Connected to Backend API: ${apiUrl}`);
    });
  } else {
    // Default Stdio Mode for Desktop & IDE Subagents
    const mcpServer = createMspMcpServer(apiClient);
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error(`[MSP MCP Server] Started and listening on stdio transport. Backend API: ${apiUrl}`);
  }
}

main().catch((error) => {
  console.error('[MSP MCP Server Fatal Error]:', error);
  process.exit(1);
});
