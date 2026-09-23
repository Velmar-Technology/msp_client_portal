import { describe, it, expect, beforeEach } from 'vitest';
import { OAuthServer } from './OAuthServer.js';
import http from 'http';
import crypto from 'crypto';
import { EventEmitter } from 'events';

// Mock HTTP Request helper
function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
}): http.IncomingMessage {
  const req = new EventEmitter() as any;
  req.method = options.method || 'GET';
  req.url = options.url || '/';
  req.headers = options.headers || {};

  process.nextTick(() => {
    if (options.body) {
      if (typeof options.body === 'object') {
        req.emit('data', Buffer.from(JSON.stringify(options.body)));
      } else {
        req.emit('data', Buffer.from(String(options.body)));
      }
    }
    req.emit('end');
  });

  return req as http.IncomingMessage;
}

// Mock HTTP Response helper
function createMockResponse(): {
  res: http.ServerResponse;
  getStatusCode: () => number;
  getHeaders: () => Record<string, string>;
  getBody: () => string;
  getJson: () => any;
} {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let body = '';

  const res = {
    writeHead: (code: number, hdrs?: Record<string, string>) => {
      statusCode = code;
      if (hdrs) {
        Object.assign(headers, hdrs);
      }
      return res;
    },
    setHeader: (name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return res;
    },
    end: (chunk?: any) => {
      if (chunk) {
        body += chunk.toString();
      }
      return res;
    },
    get headersSent() {
      return true;
    },
  } as unknown as http.ServerResponse;

  return {
    res,
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
    getBody: () => body,
    getJson: () => (body ? JSON.parse(body) : null),
  };
}

describe('OAuthServer for Google Gemini & MCP 2026-07-28', () => {
  let oauthServer: OAuthServer;
  const testMasterKey = 'test-master-secret-key-12345';
  const origin = 'https://helpdesk.velmartech.com.do';

  beforeEach(() => {
    oauthServer = new OAuthServer({
      configuredClientId: 'gemini-prod-client',
      configuredClientSecret: 'gemini-prod-secret',
      fallbackSecret: testMasterKey,
      codeTtlMs: 60 * 1000,
      tokenTtlMs: 3600 * 1000,
    });
  });

  describe('Metadata Discovery (RFC 9728 & RFC 8414)', () => {
    it('generates RFC 9728 Protected Resource Metadata pointing to MCP resource', () => {
      const metadata = oauthServer.getProtectedResourceMetadata(origin);
      expect(metadata.resource).toBe('https://helpdesk.velmartech.com.do/mcp');
      expect(metadata.authorization_servers).toContain('https://helpdesk.velmartech.com.do/mcp');
      expect(metadata.scopes_supported).toContain('mcp:all');
    });

    it('generates RFC 8414 Authorization Server Metadata with endpoints and PKCE methods', () => {
      const metadata = oauthServer.getAuthorizationServerMetadata(origin);
      expect(metadata.issuer).toBe('https://helpdesk.velmartech.com.do/mcp');
      expect(metadata.authorization_endpoint).toBe('https://helpdesk.velmartech.com.do/mcp/oauth/authorize');
      expect(metadata.token_endpoint).toBe('https://helpdesk.velmartech.com.do/mcp/oauth/token');
      expect(metadata.response_types_supported).toContain('code');
      expect(metadata.grant_types_supported).toEqual(
        expect.arrayContaining(['authorization_code', 'client_credentials', 'refresh_token'])
      );
      expect(metadata.code_challenge_methods_supported).toEqual(
        expect.arrayContaining(['S256', 'plain'])
      );
    });
  });

  describe('Authorization Flow (/mcp/oauth/authorize)', () => {
    it('renders HTML consent page on GET without auto-approval', async () => {
      const req = createMockRequest({
        method: 'GET',
        url: '/mcp/oauth/authorize?client_id=gemini-prod-client&redirect_uri=https://gemini.google.com/callback&state=xyz123',
      });
      const mockRes = createMockResponse();

      await oauthServer.handleAuthorize(req, mockRes.res, origin);

      expect(mockRes.getStatusCode()).toBe(200);
      expect(mockRes.getHeaders()['Content-Type']).toContain('text/html');
      expect(mockRes.getBody()).toContain('Velmar MSP Support');
      expect(mockRes.getBody()).toContain('gemini-prod-client');
      expect(mockRes.getBody()).toContain('Authorize Connection');
    });

    it('returns HTTP 302 redirect with code and state when auto-approved or submitted via POST', async () => {
      const req = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/authorize?client_id=gemini-prod-client&redirect_uri=https://gemini.google.com/callback&state=xyz123&auto_approve=true',
      });
      const mockRes = createMockResponse();

      await oauthServer.handleAuthorize(req, mockRes.res, origin);

      expect(mockRes.getStatusCode()).toBe(302);
      const location = mockRes.getHeaders()['Location'];
      expect(location).toBeDefined();

      const redirectUrl = new URL(location);
      expect(redirectUrl.origin + redirectUrl.pathname).toBe('https://gemini.google.com/callback');
      expect(redirectUrl.searchParams.get('state')).toBe('xyz123');
      expect(redirectUrl.searchParams.get('code')).toMatch(/^mcp_code_/);
    });

    it('rejects authorization requests with missing redirect_uri or client_id', async () => {
      const reqNoRedirect = createMockRequest({
        method: 'GET',
        url: '/mcp/oauth/authorize?client_id=gemini-prod-client',
      });
      const res1 = createMockResponse();
      await oauthServer.handleAuthorize(reqNoRedirect, res1.res, origin);
      expect(res1.getStatusCode()).toBe(400);
      expect(res1.getJson().error).toBe('invalid_request');

      const reqNoClient = createMockRequest({
        method: 'GET',
        url: '/mcp/oauth/authorize?redirect_uri=https://gemini.google.com/callback',
      });
      const res2 = createMockResponse();
      await oauthServer.handleAuthorize(reqNoClient, res2.res, origin);
      expect(res2.getStatusCode()).toBe(400);
      expect(res2.getJson().error).toBe('invalid_request');
    });
  });

  describe('Token Exchange (/mcp/oauth/token)', () => {
    it('executes full Authorization Code + PKCE (S256) exchange and validates issued token', async () => {
      // 1. Prepare PKCE verifier and challenge
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const hash = crypto.createHash('sha256').update(codeVerifier, 'ascii').digest();
      const codeChallenge = hash
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 2. Obtain code via authorize
      const authReq = createMockRequest({
        method: 'GET',
        url: `/mcp/oauth/authorize?client_id=gemini-prod-client&redirect_uri=https://gemini.google.com/callback&state=test&code_challenge=${codeChallenge}&code_challenge_method=S256&auto_approve=true`,
      });
      const authRes = createMockResponse();
      await oauthServer.handleAuthorize(authReq, authRes.res, origin);

      const redirectUrl = new URL(authRes.getHeaders()['Location']);
      const code = redirectUrl.searchParams.get('code')!;
      expect(code).toBeDefined();

      // 3. Exchange code for token
      const tokenReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://gemini.google.com/callback',
          client_id: 'gemini-prod-client',
          client_secret: 'gemini-prod-secret',
          code_verifier: codeVerifier,
        },
      });
      const tokenRes = createMockResponse();
      await oauthServer.handleToken(tokenReq, tokenRes.res);

      expect(tokenRes.getStatusCode()).toBe(200);
      const tokenJson = tokenRes.getJson();
      expect(tokenJson.access_token).toMatch(/^mcp_at_/);
      expect(tokenJson.token_type).toBe('Bearer');
      expect(tokenJson.refresh_token).toMatch(/^mcp_rt_/);
      expect(tokenJson.expires_in).toBe(3600);

      // 4. Verify access token
      expect(oauthServer.verifyAccessToken(tokenJson.access_token)).toBe(true);

      // 5. Replay attempt with same code must be rejected
      const replayReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://gemini.google.com/callback',
          client_id: 'gemini-prod-client',
          client_secret: 'gemini-prod-secret',
          code_verifier: codeVerifier,
        },
      });
      const replayRes = createMockResponse();
      await oauthServer.handleToken(replayReq, replayRes.res);
      expect(replayRes.getStatusCode()).toBe(400);
      expect(replayRes.getJson().error).toBe('invalid_grant');
    });

    it('rejects authorization_code token exchange if PKCE verifier is invalid', async () => {
      const authReq = createMockRequest({
        method: 'GET',
        url: `/mcp/oauth/authorize?client_id=gemini-prod-client&redirect_uri=https://gemini.google.com/callback&code_challenge=validchallenge123&code_challenge_method=plain&auto_approve=true`,
      });
      const authRes = createMockResponse();
      await oauthServer.handleAuthorize(authReq, authRes.res, origin);

      const code = new URL(authRes.getHeaders()['Location']).searchParams.get('code')!;

      const tokenReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: 'https://gemini.google.com/callback',
          client_id: 'gemini-prod-client',
          client_secret: 'gemini-prod-secret',
          code_verifier: 'wrong-verifier',
        },
      });
      const tokenRes = createMockResponse();
      await oauthServer.handleToken(tokenReq, tokenRes.res);

      expect(tokenRes.getStatusCode()).toBe(400);
      expect(tokenRes.getJson().error_description).toContain('PKCE verification failed');
    });

    it('supports client_credentials grant type', async () => {
      const tokenReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials&client_id=gemini-prod-client&client_secret=gemini-prod-secret&scope=mcp:all',
      });
      const tokenRes = createMockResponse();
      await oauthServer.handleToken(tokenReq, tokenRes.res);

      expect(tokenRes.getStatusCode()).toBe(200);
      const json = tokenRes.getJson();
      expect(json.access_token).toMatch(/^mcp_at_/);
      expect(oauthServer.verifyAccessToken(json.access_token)).toBe(true);
    });

    it('rejects client_credentials grant when secret is missing or invalid', async () => {
      const tokenReqNoSecret = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'client_credentials',
          client_id: 'gemini-prod-client',
        },
      });
      const tokenRes1 = createMockResponse();
      await oauthServer.handleToken(tokenReqNoSecret, tokenRes1.res);
      expect(tokenRes1.getStatusCode()).toBe(401);
      expect(tokenRes1.getJson().error).toBe('invalid_client');

      const tokenReqWrongSecret = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'client_credentials',
          client_id: 'gemini-prod-client',
          client_secret: 'wrong-secret',
        },
      });
      const tokenRes2 = createMockResponse();
      await oauthServer.handleToken(tokenReqWrongSecret, tokenRes2.res);
      expect(tokenRes2.getStatusCode()).toBe(401);
      expect(tokenRes2.getJson().error).toBe('invalid_client');
    });


    it('supports refresh_token grant type and rotates tokens', async () => {
      // Obtain initial token via client_credentials
      const initialReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'client_credentials',
          client_id: 'gemini-prod-client',
          client_secret: 'gemini-prod-secret',
        },
      });
      const initialRes = createMockResponse();
      await oauthServer.handleToken(initialReq, initialRes.res);
      const initialTokens = initialRes.getJson();

      // Exchange refresh token
      const refreshReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/token',
        headers: { 'content-type': 'application/json' },
        body: {
          grant_type: 'refresh_token',
          refresh_token: initialTokens.refresh_token,
          client_id: 'gemini-prod-client',
        },
      });
      const refreshRes = createMockResponse();
      await oauthServer.handleToken(refreshReq, refreshRes.res);

      expect(refreshRes.getStatusCode()).toBe(200);
      const newTokens = refreshRes.getJson();
      expect(newTokens.access_token).toBeDefined();
      expect(newTokens.access_token).not.toBe(initialTokens.access_token);
      expect(oauthServer.verifyAccessToken(newTokens.access_token)).toBe(true);

      // Old token should be invalidated
      expect(oauthServer.verifyAccessToken(initialTokens.access_token)).toBe(false);
    });
  });

  describe('Dynamic Client Registration (RFC 7591)', () => {
    it('registers dynamic clients and returns client_id & client_secret', async () => {
      const regReq = createMockRequest({
        method: 'POST',
        url: '/mcp/oauth/register',
        headers: { 'content-type': 'application/json' },
        body: {
          client_name: 'Dynamic Gemini Connected App',
          redirect_uris: ['https://vertexaisearch.cloud.google.com/oauth-redirect'],
        },
      });
      const regRes = createMockResponse();
      await oauthServer.handleRegister(regReq, regRes.res);

      expect(regRes.getStatusCode()).toBe(201);
      const regJson = regRes.getJson();
      expect(regJson.client_id).toMatch(/^mcp_client_/);
      expect(regJson.client_secret).toMatch(/^mcp_sec_/);
      expect(regJson.redirect_uris).toContain('https://vertexaisearch.cloud.google.com/oauth-redirect');
    });
  });

  describe('verifyAccessToken', () => {
    it('accepts the backend fallback master key (MSP_API_KEY)', () => {
      expect(oauthServer.verifyAccessToken(testMasterKey)).toBe(true);
    });

    it('rejects arbitrary invalid tokens', () => {
      expect(oauthServer.verifyAccessToken('invalid-token-xyz')).toBe(false);
      expect(oauthServer.verifyAccessToken('')).toBe(false);
    });
  });
});
