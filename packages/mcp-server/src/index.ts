#!/usr/bin/env node
import http from 'http';
import dotenv from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MspApiClient } from './client/MspApiClient.js';
import { createMspMcpServer, type McpServerProfile } from './serverFactory.js';
import { validateInboundApiKey } from './authUtils.js';
import { OAuthServer } from './auth/OAuthServer.js';

// Load environment variables (.env)
dotenv.config();

/**
 * Resolves the active server profile.
 * Precedence: CLI args (--caf, --msp) > MCP_PROFILE env var > 'all'
 */
function resolveServerProfile(): McpServerProfile {
  if (process.argv.includes('--caf') || process.argv.includes('--caf-only')) {
    return 'caf-education';
  }
  if (process.argv.includes('--msp') || process.argv.includes('--msp-only')) {
    return 'msp-support';
  }
  const envProfile = process.env.MCP_PROFILE?.trim().toLowerCase();
  if (envProfile === 'caf-education' || envProfile === 'caf') {
    return 'caf-education';
  }
  if (envProfile === 'msp-support' || envProfile === 'msp') {
    return 'msp-support';
  }
  return 'all';
}

const activeProfile = resolveServerProfile();

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

// If we are strictly in 'caf-education' profile, connection to MSP IT backend is optional
const requiresMspBackend = activeProfile !== 'caf-education';

if (requiresMspBackend && !apiUrl) {
  console.error('[MSP MCP Server Configuration Error]: MSP_API_URL is required for MSP IT profiles. Please configure MSP_API_URL in mcp_config.json or your environment.');
  process.exit(1);
}

if (requiresMspBackend && !apiToken) {
  console.error('[MSP MCP Server Configuration Error]: MSP_API_KEY is required for MSP IT profiles. Please configure MSP_API_KEY in mcp_config.json or your environment.');
  process.exit(1);
}

// Initialize the API client adapter (optional for standalone CAF mode)
const apiClient = apiUrl && apiToken
  ? new MspApiClient({ apiUrl, apiToken, tenantId })
  : undefined;

const isHttpMode = process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http';

/**
 * Main execution entry point. Launches the server in either:
 * - Stateless Streamable HTTP mode (2026-07-28 Spec) when --http or MCP_TRANSPORT=http is set.
 * - Stdio mode for local CLI, IDE subagents, and desktop clients.
 */
async function main(): Promise<void> {
  if (isHttpMode) {
    const port = Number(process.env.MCP_HTTP_PORT || process.env.MCP_PORT || 3005);

    const oauthServer = new OAuthServer({
      configuredClientId: process.env.MCP_OAUTH_CLIENT_ID,
      configuredClientSecret: process.env.MCP_OAUTH_CLIENT_SECRET,
      fallbackSecret: (process.env.MCP_SERVER_API_KEY || apiToken).trim(),
    });

    const httpServer = http.createServer(async (req, res) => {
      // CORS & standard headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-API-Key, X-Tenant-Id, X-User-Id, X-BYOK-Api-Key, X-BYOK-Provider, X-BYOK-Model'
      );

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
      const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'helpdesk.velmartech.com.do';
      const origin = process.env.MCP_SERVER_PUBLIC_URL || `${proto}://${host}`;
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      // 1. OAuth 2.0 / 2.1 Protected Resource Metadata (RFC 9728)
      if (
        req.method === 'GET' &&
        (url.pathname === '/.well-known/oauth-protected-resource' ||
          url.pathname === '/mcp/.well-known/oauth-protected-resource' ||
          url.pathname === '/api/v1/mcp/.well-known/oauth-protected-resource')
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(oauthServer.getProtectedResourceMetadata(origin)));
        return;
      }

      // 2. OAuth 2.0 Authorization Server Metadata (RFC 8414 & OpenID Connect Discovery)
      if (
        req.method === 'GET' &&
        (url.pathname === '/.well-known/oauth-authorization-server' ||
          url.pathname === '/mcp/.well-known/oauth-authorization-server' ||
          url.pathname === '/.well-known/openid-configuration' ||
          url.pathname === '/mcp/.well-known/openid-configuration' ||
          url.pathname === '/api/v1/mcp/.well-known/oauth-authorization-server')
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(oauthServer.getAuthorizationServerMetadata(origin)));
        return;
      }

      // 3. OAuth 2.0 Authorize Endpoint
      if (
        url.pathname === '/mcp/oauth/authorize' ||
        url.pathname === '/oauth/authorize' ||
        url.pathname === '/api/v1/mcp/oauth/authorize'
      ) {
        await oauthServer.handleAuthorize(req, res, origin);
        return;
      }

      // 4. OAuth 2.0 Token Endpoint
      if (
        req.method === 'POST' &&
        (url.pathname === '/mcp/oauth/token' ||
          url.pathname === '/oauth/token' ||
          url.pathname === '/api/v1/mcp/oauth/token')
      ) {
        await oauthServer.handleToken(req, res);
        return;
      }

      // 5. OAuth 2.0 Dynamic Client Registration (RFC 7591)
      if (
        req.method === 'POST' &&
        (url.pathname === '/mcp/oauth/register' ||
          url.pathname === '/oauth/register' ||
          url.pathname === '/api/v1/mcp/oauth/register')
      ) {
        await oauthServer.handleRegister(req, res);
        return;
      }

      // 6. Health check & Capabilities Discovery
      if (
        url.pathname === '/health' ||
        url.pathname === '/' ||
        url.pathname === '/mcp/health' ||
        url.pathname === '/mcp/caf/health' ||
        (req.method === 'GET' && (url.pathname === '/mcp' || url.pathname === '/mcp/caf' || url.pathname === '/api/v1/mcp'))
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'UP',
            server: activeProfile === 'caf-education' ? 'caf-education-server' : 'msp-unified-server',
            version: '1.12.0',
            spec: 'MCP 2026-07-28 (Stateless Streamable HTTP)',
            transport: 'streamable-http',
            activeProfile,
            auth: {
              oauthSupported: true,
              authorizationServerMetadata: `${origin}/mcp/.well-known/oauth-authorization-server`,
              protectedResourceMetadata: `${origin}/mcp/.well-known/oauth-protected-resource`,
            },
            availableEndpoints: {
              cafIsolated: '/mcp/caf (Academic CAF 9 Criteria & PII Privacy Only)',
              supportAdmin: '/mcp (Configured Profile / Administrative)',
            },
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // 7. Route: /mcp/caf -> STRICTLY ISOLATED CAF EDUCATIONAL TOOLS ONLY
      if (url.pathname === '/mcp/caf' || url.pathname === '/api/v1/mcp/caf') {
        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });
          // Explicitly instantiate server strictly with 'caf-education' profile (zero IT tools)
          const mcpServer = createMspMcpServer(apiClient, 'caf-education');
          await mcpServer.connect(transport);
          await transport.handleRequest(req, res);
        } catch (err: any) {
          console.error('[CAF MCP HTTP Transport Error]:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err?.message || 'Internal CAF MCP Server Error' }));
          }
        }
        return;
      }

      // 8. Route: /mcp (Standard / Admin Endpoint)
      if (url.pathname === '/mcp' || url.pathname === '/api/v1/mcp') {
        const expectedInboundKey = (process.env.MCP_SERVER_API_KEY || apiToken).trim();
        const requireAuth = process.env.MCP_REQUIRE_AUTH !== 'false';

        const isAuthorized =
          !requireAuth ||
          validateInboundApiKey(req, expectedInboundKey, (token) =>
            oauthServer.verifyAccessToken(token)
          );

        if (!isAuthorized) {
          const resourceMetadataUrl = `${origin.replace(/\/+$/, '')}/mcp/.well-known/oauth-protected-resource`;
          res.setHeader(
            'WWW-Authenticate',
            `Bearer resource_metadata="${resourceMetadataUrl}", error="unauthorized"`
          );
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message:
                  'Unauthorized: Missing or invalid credentials. Provide an API key or OAuth 2.0 Bearer token.',
              },
            })
          );
          return;
        }

        try {
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
          });
          const mcpServer = createMspMcpServer(apiClient, activeProfile);
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
      console.log(`[MSP MCP Server] Stateless Streamable HTTP Server listening on port ${port}`);
      console.log(`  🎓 Isolated CAF Education Endpoint: http://0.0.0.0:${port}/mcp/caf`);
      console.log(`  🛡️  General/Administrative Endpoint: http://0.0.0.0:${port}/mcp`);
      console.log(`  ⚙️  Active Server Profile: ${activeProfile.toUpperCase()}`);
    });
  } else {
    // Default Stdio Mode for Desktop & IDE Subagents
    const mcpServer = createMspMcpServer(apiClient, activeProfile);
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error(`[MSP MCP Server] Started in stdio transport. Profile: ${activeProfile.toUpperCase()}`);
  }
}

main().catch((error) => {
  console.error('[MSP MCP Server Fatal Error]:', error);
  process.exit(1);
});

export {
  createMspMcpServer,
  type McpServerProfile,
  type CreateMcpServerOptions,
} from './serverFactory.js';

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

export {
  OAuthServer,
  type OAuthClient,
  type OAuthServerOptions,
} from './auth/OAuthServer.js';
