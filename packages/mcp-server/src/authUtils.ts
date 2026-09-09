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
 * Extracts and validates the inbound API key from incoming HTTP request headers.
 * Supports:
 * - `X-API-Key: <key>`
 * - `Authorization: Bearer <key>`
 * - `Authorization: <key>`
 *
 * @param req - Incoming Node.js HTTP request
 * @param expectedKey - Expected secret token or API key
 * @returns boolean indicating whether request is authorized
 */
export function validateInboundApiKey(req: http.IncomingMessage, expectedKey: string): boolean {
  if (!expectedKey) {
    return true;
  }

  // 1. Check X-API-Key header (case-insensitive in Node HTTP req.headers)
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && timingSafeCompare(apiKeyHeader.trim(), expectedKey)) {
    return true;
  }

  // 2. Check Authorization header (with optional Bearer prefix)
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string') {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (timingSafeCompare(token, expectedKey)) {
      return true;
    }
  }

  return false;
}
