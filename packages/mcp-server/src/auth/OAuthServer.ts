import http from 'http';
import crypto from 'crypto';
import { URL } from 'url';

/**
 * Registered or dynamically issued OAuth client representation.
 */
export interface OAuthClient {
  clientId: string;
  clientSecret?: string;
  clientName?: string;
  redirectUris?: string[];
  createdAt: number;
}

/**
 * Ephemeral Authorization Code data structure.
 */
export interface AuthorizationCodeRecord {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  expiresAt: number;
  used: boolean;
}

/**
 * Active OAuth Access & Refresh Token record.
 */
export interface OAuthTokenRecord {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  scope: string;
  expiresAt: number;
}

/**
 * Configuration options for OAuthServer.
 */
export interface OAuthServerOptions {
  configuredClientId?: string;
  configuredClientSecret?: string;
  fallbackSecret?: string;
  codeTtlMs?: number; // default: 5 minutes (300,000 ms)
  tokenTtlMs?: number; // default: 24 hours (86,400,000 ms)
}

/**
 * OAuth 2.0 / 2.1 Server for Model Context Protocol (MCP 2026-07-28 Spec)
 *
 * Implements:
 * - RFC 9728: OAuth 2.0 Protected Resource Metadata
 * - RFC 8414: OAuth 2.0 Authorization Server Metadata
 * - RFC 7636: Proof Key for Code Exchange (PKCE)
 * - RFC 7591: Dynamic Client Registration
 * - RFC 6749: The OAuth 2.0 Authorization Framework
 */
export class OAuthServer {
  private clients = new Map<string, OAuthClient>();
  private authCodes = new Map<string, AuthorizationCodeRecord>();
  private tokens = new Map<string, OAuthTokenRecord>();
  private refreshTokens = new Map<string, string>(); // refreshToken -> accessToken

  private readonly configuredClientId?: string;
  private readonly configuredClientSecret?: string;
  private readonly fallbackSecret: string;
  private readonly codeTtlMs: number;
  private readonly tokenTtlMs: number;

  constructor(options: OAuthServerOptions = {}) {
    this.configuredClientId = options.configuredClientId?.trim();
    this.configuredClientSecret = options.configuredClientSecret?.trim();
    this.fallbackSecret = options.fallbackSecret || crypto.randomBytes(32).toString('hex');
    this.codeTtlMs = options.codeTtlMs || 5 * 60 * 1000;
    this.tokenTtlMs = options.tokenTtlMs || 24 * 60 * 60 * 1000;

    // Register pre-configured client if provided in environment
    if (this.configuredClientId) {
      this.registerClient({
        clientId: this.configuredClientId,
        clientSecret: this.configuredClientSecret,
        clientName: 'Configured MCP Client',
      });
    }
  }

  /**
   * Registers a client into the memory store.
   */
  public registerClient(client: Omit<OAuthClient, 'createdAt'>): OAuthClient {
    const fullClient: OAuthClient = {
      ...client,
      createdAt: Date.now(),
    };
    this.clients.set(client.clientId, fullClient);
    return fullClient;
  }

  /**
   * Generates RFC 9728 Protected Resource Metadata.
   *
   * @param origin - Base origin URL (e.g., https://helpdesk.velmartech.com.do)
   */
  public getProtectedResourceMetadata(origin: string): Record<string, any> {
    const cleanOrigin = origin.replace(/\/+$/, '');
    return {
      resource: `${cleanOrigin}/mcp`,
      authorization_servers: [cleanOrigin, `${cleanOrigin}/mcp`],
      scopes_supported: ['mcp:all', 'mcp:read', 'mcp:write', 'mcp:execute'],
      bearer_methods_supported: ['header'],
      resource_documentation: `${cleanOrigin}/mcp/docs`,
    };
  }

  /**
   * Generates RFC 8414 Authorization Server Metadata.
   *
   * @param origin - Base origin URL (e.g., https://helpdesk.velmartech.com.do)
   */
  public getAuthorizationServerMetadata(origin: string): Record<string, any> {
    const cleanOrigin = origin.replace(/\/+$/, '');
    return {
      issuer: `${cleanOrigin}/mcp`,
      authorization_endpoint: `${cleanOrigin}/mcp/oauth/authorize`,
      token_endpoint: `${cleanOrigin}/mcp/oauth/token`,
      registration_endpoint: `${cleanOrigin}/mcp/oauth/register`,
      jwks_uri: `${cleanOrigin}/mcp/oauth/jwks`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
      code_challenge_methods_supported: ['S256', 'plain'],
      scopes_supported: ['mcp:all', 'mcp:read', 'mcp:write', 'mcp:execute'],
    };
  }

  /**
   * Handles GET or POST requests to `/mcp/oauth/authorize`.
   */
  public async handleAuthorize(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    origin: string
  ): Promise<void> {
    const url = new URL(req.url || '/', origin);
    const clientId = url.searchParams.get('client_id') || '';
    const redirectUri = url.searchParams.get('redirect_uri') || '';
    const state = url.searchParams.get('state') || '';
    const scope = url.searchParams.get('scope') || 'mcp:all';
    const codeChallenge = url.searchParams.get('code_challenge') || undefined;
    const codeChallengeMethod = (url.searchParams.get('code_challenge_method') as 'S256' | 'plain') || undefined;
    const autoApprove = url.searchParams.get('auto_approve') === 'true' || req.method === 'POST';

    if (!redirectUri) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_request', error_description: 'Missing redirect_uri parameter' }));
      return;
    }

    if (!clientId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'invalid_request', error_description: 'Missing client_id parameter' }));
      return;
    }

    // Auto-approve or user confirmed authorization
    if (autoApprove) {
      const code = this.generateAuthorizationCode({
        clientId,
        redirectUri,
        scope,
        codeChallenge,
        codeChallengeMethod,
      });

      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('code', code);
      if (state) {
        targetUrl.searchParams.set('state', state);
      }

      res.writeHead(302, {
        Location: targetUrl.toString(),
        'Cache-Control': 'no-store',
      });
      res.end();
      return;
    }

    // Render interactive Velmar Technology branded OAuth consent page
    const consentHtml = this.renderConsentPage({
      clientId,
      redirectUri,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
    });

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(consentHtml);
  }

  /**
   * Handles POST requests to `/mcp/oauth/token`.
   */
  public async handleToken(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const grantType = body.grant_type;

      // Extract client credentials from Authorization header or body
      let clientId = body.client_id;
      let clientSecret = body.client_secret;

      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Basic ')) {
        const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
        const [u, p] = credentials.split(':');
        if (u) clientId = decodeURIComponent(u);
        if (p) clientSecret = decodeURIComponent(p);
      }

      // 1. Authorization Code Grant
      if (grantType === 'authorization_code') {
        const code = body.code;
        const redirectUri = body.redirect_uri;
        const codeVerifier = body.code_verifier;

        if (!code) {
          this.sendJsonError(res, 400, 'invalid_request', 'Missing code parameter');
          return;
        }

        const authCodeRecord = this.authCodes.get(code);
        if (!authCodeRecord) {
          this.sendJsonError(res, 400, 'invalid_grant', 'Invalid or expired authorization code');
          return;
        }

        if (authCodeRecord.used) {
          this.authCodes.delete(code);
          this.sendJsonError(res, 400, 'invalid_grant', 'Authorization code has already been used');
          return;
        }

        if (Date.now() > authCodeRecord.expiresAt) {
          this.authCodes.delete(code);
          this.sendJsonError(res, 400, 'invalid_grant', 'Authorization code has expired');
          return;
        }

        // Validate redirect_uri if specified in original authorize call
        if (authCodeRecord.redirectUri && redirectUri && authCodeRecord.redirectUri !== redirectUri) {
          this.sendJsonError(res, 400, 'invalid_grant', 'redirect_uri does not match original request');
          return;
        }

        // Validate PKCE if code challenge was present
        if (authCodeRecord.codeChallenge) {
          if (!codeVerifier) {
            this.sendJsonError(res, 400, 'invalid_request', 'Missing code_verifier for PKCE');
            return;
          }

          const isValidVerifier = this.verifyCodeChallenge(
            codeVerifier,
            authCodeRecord.codeChallenge,
            authCodeRecord.codeChallengeMethod || 'S256'
          );

          if (!isValidVerifier) {
            this.sendJsonError(res, 400, 'invalid_grant', 'PKCE verification failed');
            return;
          }
        }

        // Validate client secret if client has one registered
        if (!this.verifyClientSecret(authCodeRecord.clientId, clientSecret)) {
          this.sendJsonError(res, 401, 'invalid_client', 'Client authentication failed');
          return;
        }

        // Mark code as used
        authCodeRecord.used = true;
        this.authCodes.delete(code);

        // Issue tokens
        const tokenResponse = this.issueTokens(authCodeRecord.clientId, authCodeRecord.scope);
        this.sendJsonResponse(res, 200, tokenResponse);
        return;
      }

      // 2. Client Credentials Grant
      if (grantType === 'client_credentials') {
        if (!clientId || !this.verifyClientSecret(clientId, clientSecret, true)) {
          this.sendJsonError(res, 401, 'invalid_client', 'Client authentication failed');
          return;
        }

        const scope = body.scope || 'mcp:all';
        const tokenResponse = this.issueTokens(clientId, scope);
        this.sendJsonResponse(res, 200, tokenResponse);
        return;
      }

      // 3. Refresh Token Grant
      if (grantType === 'refresh_token') {
        const refreshToken = body.refresh_token;
        if (!refreshToken || !this.refreshTokens.has(refreshToken)) {
          this.sendJsonError(res, 400, 'invalid_grant', 'Invalid or expired refresh token');
          return;
        }

        const oldAccessToken = this.refreshTokens.get(refreshToken)!;
        const oldTokenRecord = this.tokens.get(oldAccessToken);
        const resolvedClientId = oldTokenRecord?.clientId || clientId || 'default-client';
        const resolvedScope = oldTokenRecord?.scope || 'mcp:all';

        // Revoke old tokens
        this.refreshTokens.delete(refreshToken);
        if (oldAccessToken) this.tokens.delete(oldAccessToken);

        // Issue new token pair
        const tokenResponse = this.issueTokens(resolvedClientId, resolvedScope);
        this.sendJsonResponse(res, 200, tokenResponse);
        return;
      }

      this.sendJsonError(res, 400, 'unsupported_grant_type', `Unsupported grant_type: ${grantType}`);
    } catch (err: any) {
      this.sendJsonError(res, 500, 'server_error', err.message || 'Token exchange failed');
    }
  }

  /**
   * Handles RFC 7591 Dynamic Client Registration.
   */
  public async handleRegister(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    try {
      const body = await this.parseRequestBody(req);
      const clientName = body.client_name || 'Gemini Connected App';
      const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];

      const clientId = `mcp_client_${crypto.randomBytes(12).toString('hex')}`;
      const clientSecret = `mcp_sec_${crypto.randomBytes(24).toString('hex')}`;

      this.registerClient({
        clientId,
        clientSecret,
        clientName,
        redirectUris,
      });

      this.sendJsonResponse(res, 201, {
        client_id: clientId,
        client_secret: clientSecret,
        client_name: clientName,
        redirect_uris: redirectUris,
        grant_types: ['authorization_code', 'client_credentials', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      });
    } catch (err: any) {
      this.sendJsonError(res, 400, 'invalid_request', err.message || 'Registration failed');
    }
  }

  /**
   * Validates whether a provided Bearer token is valid and active.
   */
  public verifyAccessToken(token: string): boolean {
    if (!token) return false;

    // 1. Direct match with configured backend master key
    if (this.fallbackSecret && this.timingSafeCompare(token, this.fallbackSecret)) {
      return true;
    }

    // 2. Active OAuth token registry
    const record = this.tokens.get(token);
    if (!record) {
      return false;
    }

    if (Date.now() > record.expiresAt) {
      this.tokens.delete(token);
      if (record.refreshToken) {
        this.refreshTokens.delete(record.refreshToken);
      }
      return false;
    }

    return true;
  }

  // --- Internal Helpers ---

  private generateAuthorizationCode(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    codeChallenge?: string;
    codeChallengeMethod?: 'S256' | 'plain';
  }): string {
    const code = `mcp_code_${crypto.randomBytes(24).toString('hex')}`;
    this.authCodes.set(code, {
      code,
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      scope: params.scope,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
      expiresAt: Date.now() + this.codeTtlMs,
      used: false,
    });
    return code;
  }

  /**
   * Sweeps and deletes expired authorization codes and tokens.
   */
  public cleanupExpiredRecords(): void {
    const now = Date.now();
    for (const [code, record] of this.authCodes.entries()) {
      if (record.used || now > record.expiresAt) {
        this.authCodes.delete(code);
      }
    }
    for (const [token, record] of this.tokens.entries()) {
      if (now > record.expiresAt) {
        this.tokens.delete(token);
        if (record.refreshToken) {
          this.refreshTokens.delete(record.refreshToken);
        }
      }
    }
  }

  private issueTokens(clientId: string, scope: string) {
    this.cleanupExpiredRecords();
    const accessToken = `mcp_at_${crypto.randomBytes(32).toString('hex')}`;
    const refreshToken = `mcp_rt_${crypto.randomBytes(32).toString('hex')}`;
    const expiresInSeconds = Math.floor(this.tokenTtlMs / 1000);

    const record: OAuthTokenRecord = {
      accessToken,
      refreshToken,
      clientId,
      scope,
      expiresAt: Date.now() + this.tokenTtlMs,
    };

    this.tokens.set(accessToken, record);
    this.refreshTokens.set(refreshToken, accessToken);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresInSeconds,
      refresh_token: refreshToken,
      scope,
    };
  }

  private verifyClientSecret(
    clientId: string,
    clientSecret?: string,
    requireSecret = false
  ): boolean {
    if (requireSecret && !clientSecret) {
      return false;
    }

    // 1. If configured server secret exists, match against it
    if (this.configuredClientSecret) {
      return !!clientSecret && this.timingSafeCompare(clientSecret, this.configuredClientSecret);
    }

    // 2. Match against registered clients
    const client = this.clients.get(clientId);
    if (client && client.clientSecret) {
      return !!clientSecret && this.timingSafeCompare(clientSecret, client.clientSecret);
    }

    // 3. Fallback: match against fallback master secret if supplied
    if (this.fallbackSecret && clientSecret && this.timingSafeCompare(clientSecret, this.fallbackSecret)) {
      return true;
    }

    // If a secret was explicitly required, failure to match any secret denies access
    if (requireSecret) {
      return false;
    }

    // If no client secret is required for public PKCE clients, allow
    return true;
  }

  private verifyCodeChallenge(
    verifier: string,
    challenge: string,
    method: 'S256' | 'plain'
  ): boolean {
    if (method === 'plain') {
      return this.timingSafeCompare(verifier, challenge);
    }
    // S256: BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
    const hash = crypto.createHash('sha256').update(verifier, 'ascii').digest();
    const computedChallenge = hash
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return this.timingSafeCompare(computedChallenge, challenge);
  }

  private timingSafeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  private async parseRequestBody(req: http.IncomingMessage): Promise<Record<string, any>> {
    const MAX_BODY_BYTES = 64 * 1024; // 64 KB limit
    return new Promise((resolve, reject) => {
      let body = '';
      let receivedBytes = 0;

      req.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_BODY_BYTES) {
          req.destroy(new Error('Payload Too Large'));
          reject(new Error('Payload Too Large'));
          return;
        }
        body += chunk;
      });
      req.on('end', () => {
        const contentType = req.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (e) {
            reject(new Error('Malformed JSON payload'));
          }
        } else {
          // Parse urlencoded
          const params = new URLSearchParams(body);
          const result: Record<string, any> = {};
          for (const [key, value] of params.entries()) {
            result[key] = value;
          }
          resolve(result);
        }
      });
      req.on('error', reject);
    });
  }

  private sendJsonResponse(res: http.ServerResponse, statusCode: number, data: any) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    });
    res.end(JSON.stringify(data));
  }

  private sendJsonError(
    res: http.ServerResponse,
    statusCode: number,
    error: string,
    description: string
  ) {
    this.sendJsonResponse(res, statusCode, {
      error,
      error_description: description,
    });
  }

  private renderConsentPage(params: {
    clientId: string;
    redirectUri: string;
    scope: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): string {
    const esc = (s?: string) =>
      (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Google Gemini | Velmar Technology MSP</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --border: #1f2937;
      --text-main: #f9fafb;
      --text-sub: #9ca3af;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --accent: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      max-width: 480px;
      width: 100%;
      padding: 32px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    p {
      color: var(--text-sub);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .info-box {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: var(--text-sub); }
    .info-val { font-weight: 600; color: #e2e8f0; word-break: break-all; }
    .scopes-list {
      margin-top: 12px;
      padding-left: 20px;
      color: #cbd5e1;
    }
    .scopes-list li { margin-bottom: 4px; }
    .actions {
      display: flex;
      gap: 12px;
    }
    button {
      flex: 1;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease-in-out;
    }
    .btn-approve {
      background: var(--primary);
      color: #ffffff;
    }
    .btn-approve:hover { background: var(--primary-hover); }
    .btn-deny {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-sub);
    }
    .btn-deny:hover {
      background: #1f2937;
      color: var(--text-main);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Model Context Protocol (MCP 2026-07-28)</div>
    <h1>Connect to Velmar MSP Support</h1>
    <p>Google Gemini Connected App is requesting authorization to interface with your MSP IT Support backend.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Application:</span>
        <span class="info-val">Google Gemini Spark / Agent</span>
      </div>
      <div class="info-row">
        <span class="info-label">Client ID:</span>
        <span class="info-val">${esc(params.clientId)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Permissions:</span>
        <span class="info-val">${esc(params.scope)}</span>
      </div>
      <ul class="scopes-list">
        <li>Diagnostic Telemetry & RMM Inspection</li>
        <li>Automated Ticket Triage & Status Updates</li>
        <li>Host Remediation & Security Posture Audit</li>
      </ul>
    </div>

    <form method="POST" action="/mcp/oauth/authorize?${new URLSearchParams({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      scope: params.scope,
      state: params.state || '',
      code_challenge: params.codeChallenge || '',
      code_challenge_method: params.codeChallengeMethod || '',
      auto_approve: 'true',
    }).toString()}">
      <div class="actions">
        <button type="button" class="btn-deny" onclick="window.history.back()">Cancel</button>
        <button type="submit" class="btn-approve">Authorize Connection</button>
      </div>
    </form>
  </div>
</body>
</html>`;
  }
}
