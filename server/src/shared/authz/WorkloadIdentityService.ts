import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { WorkloadClaims, WorkloadIdentityToken } from './types';
import { WORKLOAD_CONSTANTS } from './constants';
import { logger } from '../utils/logger';

/**
 * Workload Identity & Non-Human PoLP Service.
 *
 * Implements SPIFFE/SPIRE-inspired cryptographic identity issuance and verification
 * for non-human identities (RMM agents, background workers, AI agents, CI/CD).
 */
export class WorkloadIdentityService {
  private signingSecret: string;

  constructor(secret?: string) {
    this.signingSecret = secret || process.env.WORKLOAD_SIGNING_SECRET || WORKLOAD_CONSTANTS.DEFAULT_SIGNING_SECRET;
  }

  /**
   * Generates a canonical SPIFFE ID for a workload.
   *
   * @param tenantId - Tenant domain boundary
   * @param workloadType - Category of workload
   * @param workloadId - Unique agent/service identifier
   * @returns Formatted SPIFFE ID URI
   */
  formatSpiffeId(
    tenantId: string,
    workloadType: 'rmm_agent' | 'microservice' | 'ai_agent' | 'ci_pipeline',
    workloadId: string,
  ): string {
    return `${WORKLOAD_CONSTANTS.SPIFFE_SCHEME}/tenant/${tenantId}/${workloadType}/${workloadId}`;
  }

  /**
   * Parses a SPIFFE ID into its constituent components.
   */
  parseSpiffeId(spiffeId: string): { tenantId: string; workloadType: string; workloadId: string } {
    const pattern = /^spiffe:\/\/msp\.portal\/tenant\/([^/]+)\/([^/]+)\/([^/]+)$/;
    const match = spiffeId.match(pattern);
    if (!match) {
      throw new Error(`Invalid SPIFFE ID format: "${spiffeId}"`);
    }

    return {
      tenantId: match[1],
      workloadType: match[2],
      workloadId: match[3],
    };
  }

  /**
   * Issues a cryptographically signed, short-lived Workload Identity Token.
   *
   * @param params - Workload registration parameters
   * @param ttlSeconds - Validity window (default: 300s / 5 minutes)
   * @returns Verifiable WorkloadIdentityToken
   */
  issueToken(
    params: {
      tenantId: string;
      workloadType: 'rmm_agent' | 'microservice' | 'ai_agent' | 'ci_pipeline';
      workloadId: string;
      allowedActions: string[];
      allowedResourcePrefixes: string[];
    },
    ttlSeconds = WORKLOAD_CONSTANTS.DEFAULT_TTL_SECONDS,
  ): WorkloadIdentityToken {
    const now = Math.floor(Date.now() / 1000);
    const spiffeId = this.formatSpiffeId(params.tenantId, params.workloadType, params.workloadId);

    const claims: WorkloadClaims = {
      spiffeId,
      workloadType: params.workloadType,
      tenantId: params.tenantId,
      allowedActions: params.allowedActions,
      allowedResourcePrefixes: params.allowedResourcePrefixes,
      issuedAt: now,
      expiresAt: now + ttlSeconds,
      nonce: randomBytes(WORKLOAD_CONSTANTS.NONCE_BYTES_LENGTH).toString('hex'),
    };

    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = createHmac('sha256', this.signingSecret).update(payload).digest('base64url');
    const token = `${payload}.${signature}`;

    logger.debug('Issued workload identity token', {
      service: 'msp-services',
      spiffeId,
      expiresAt: claims.expiresAt,
    });

    return {
      token,
      claims,
      signature,
    };
  }

  /**
   * Cryptographically verifies and validates a Workload Identity Token.
   *
   * @param tokenStr - Raw token string formatted as `<payload>.<signature>`
   * @returns Decoded WorkloadClaims if valid
   * @throws Error if signature is invalid or token has expired
   */
  verifyToken(tokenStr: string): WorkloadClaims {
    if (!tokenStr || typeof tokenStr !== 'string') {
      throw new Error('Missing or malformed workload token');
    }

    const parts = tokenStr.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid token structure (expected payload.signature)');
    }

    const [payload, signature] = parts;
    const expectedSignature = createHmac('sha256', this.signingSecret).update(payload).digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedSigBuffer.length || !timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      throw new Error('Cryptographic signature verification failed');
    }

    const jsonStr = Buffer.from(payload, 'base64url').toString('utf8');
    const claims: WorkloadClaims = JSON.parse(jsonStr);

    const now = Math.floor(Date.now() / 1000);
    if (claims.expiresAt <= now) {
      throw new Error(`Workload token expired at ${new Date(claims.expiresAt * 1000).toISOString()}`);
    }

    return claims;
  }

  /**
   * Evaluates whether a workload's claims permit an action against a specific resource target.
   *
   * @param claims - Validated WorkloadClaims
   * @param action - Intended action (e.g. `telemetry:write`, `patch:execute`)
   * @param resourceId - Target resource identifier (e.g. `equipment:eq-101`)
   * @returns True if allowed within workload's narrow capability window
   */
  isAuthorized(claims: WorkloadClaims, action: string, resourceId: string): boolean {
    // 1. Action check
    const actionAllowed = claims.allowedActions.includes('*') || claims.allowedActions.includes(action);
    if (!actionAllowed) {
      return false;
    }

    // 2. Resource prefix check
    const resourceAllowed = claims.allowedResourcePrefixes.some((prefix) =>
      prefix === '*' || resourceId.startsWith(prefix)
    );

    return resourceAllowed;
  }
}

export const workloadIdentityService = new WorkloadIdentityService();
