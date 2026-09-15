#!/usr/bin/env node
import http from 'http';
import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MspApiClient } from './client/MspApiClient.js';
import { createMspMcpServer } from './serverFactory.js';
import { validateInboundApiKey } from './authUtils.js';

// Load environment variables (.env)
dotenv.config();

/**
 * Resolves the backend API base URL.
 * Priority: MSP_API_URL > MSP_SERVER_URL (the `/api/v1` suffix is appended automatically if omitted).
 */
function resolveApiUrl(): string {
  let apiUrl = process.env.MSP_API_URL?.trim().replace(/\/+$/, '');
  if (apiUrl) {
    if (!/^https?:\/\//i.test(apiUrl)) {
      apiUrl = `https://${apiUrl}`;
    }
    return apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
  }
  let serverUrl = process.env.MSP_SERVER_URL?.trim().replace(/\/+$/, '');
  if (serverUrl) {
    if (!/^https?:\/\//i.test(serverUrl)) {
      serverUrl = `https://${serverUrl}`;
    }
    return serverUrl.endsWith('/api/v1') ? serverUrl : `${serverUrl}/api/v1`;
  }
  return '';
}

const apiUrl = resolveApiUrl();
const apiToken = (process.env.MSP_API_KEY || process.env.MSP_API_TOKEN || '').trim();
const tenantId = process.env.MSP_TENANT_ID;

if (!apiUrl) {
  console.error('[MSP MCP Server Configuration Error]: MSP_API_URL is required. Please configure MSP_API_URL in mcp_config.json or your environment.');
  process.exit(1);
}

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

    const httpServer = http.createServer(async (req, res) => {
      // CORS & standard headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Tenant-Id, X-User-Id, X-BYOK-Api-Key, X-BYOK-Provider, X-BYOK-Model');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (
        url.pathname === '/health' ||
        url.pathname === '/' ||
        url.pathname === '/mcp/health' ||
        (req.method === 'GET' && (url.pathname === '/mcp' || url.pathname === '/api/v1/mcp'))
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'UP',
            server: 'msp-support-server',
            version: '1.10.2',
            spec: 'MCP 2026-07-28 (Stateless Streamable HTTP)',
            transport: 'streamable-http',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      if (url.pathname === '/mcp' || url.pathname === '/api/v1/mcp') {
        // Inbound Authentication for Copilot Studio / HTTP Clients (Option B)
        const expectedInboundKey = (process.env.MCP_SERVER_API_KEY || apiToken).trim();
        const requireAuth = process.env.MCP_REQUIRE_AUTH !== 'false';

        if (requireAuth && expectedInboundKey && !validateInboundApiKey(req, expectedInboundKey)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message:
                  'Unauthorized: Missing or invalid API key. Provide a valid key via "X-API-Key" or "Authorization: Bearer <key>".',
              },
            })
          );
          return;
        }

        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });
          const mcpServer = createMspMcpServer(apiClient);
          await mcpServer.connect(transport);
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
      console.log(`[MSP MCP Server] Inbound Authentication: ${process.env.MCP_REQUIRE_AUTH !== 'false' ? 'ENABLED (X-API-Key / Authorization)' : 'DISABLED'}`);
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

export {
  MspSupportAgent,
  type TicketTriageReport,
  type QbrAuditReport,
} from './agent/MspSupportAgent.js';

export {
  CafQualityAgent,
  CAF_CRITERIA,
  type CafAuditReport,
  type CafCriterionScore,
  type CafSurveyAnalysisReport,
  type CafImprovementPlan,
  type PmiActionItem,
} from './caf/CafQualityAgent.js';

export {
  CafPrivacyFilter,
  type AnonymizationResult,
} from './caf/CafPrivacyFilter.js';

export {
  ByokLlmClient,
  ByokKeyMissingError,
  type ByokProvider,
  type ByokLlmConfig,
  type ByokGenerateOptions,
  type ByokLlmResponse,
} from './byok/ByokLlmClient.js';

export {
  TenantByokManager,
  type TenantByokProfile,
  type TenantByokStatus,
} from './byok/TenantByokManager.js';
