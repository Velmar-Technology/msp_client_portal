import http from 'http';
import crypto from 'crypto';

/**
 * Constant-time string equality check to prevent timing attacks.
 *
 * @param a - Provided string
 * @param b - Expected string
 * @returns boolean indicating whether strings match in constant time
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extracts and validates the inbound API key or OAuth Bearer token from incoming HTTP request headers.
 * Supports:
 * - `X-API-Key: <key>`
 * - `Authorization: Bearer <key_or_oauth_token>`
 * - `Authorization: <key>`
 *
 * @param req - Incoming Node.js HTTP request
 * @param expectedKey - Expected secret token or API key
 * @param oauthVerifier - Optional function validating OAuth access tokens
 * @returns boolean indicating whether request is authorized
 */
export function validateInboundApiKey(
  req: http.IncomingMessage,
  expectedKey: string,
  oauthVerifier?: (token: string) => boolean
): boolean {
  // If neither key nor verifier is enforced, allow
  if (!expectedKey && !oauthVerifier) {
    return true;
  }

  // 1. Check X-API-Key header (case-insensitive in Node HTTP req.headers)
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    const rawKey = apiKeyHeader.trim();
    if (expectedKey && timingSafeCompare(rawKey, expectedKey)) {
      return true;
    }
    if (oauthVerifier && oauthVerifier(rawKey)) {
      return true;
    }
  }

  // 2. Check Authorization header (with optional Bearer prefix)
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string') {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (expectedKey && timingSafeCompare(token, expectedKey)) {
      return true;
    }
    if (oauthVerifier && oauthVerifier(token)) {
      return true;
    }
  }

  return false;
}
