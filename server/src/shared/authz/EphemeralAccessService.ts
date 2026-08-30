import { randomUUID } from 'crypto';
import { JitAccessRequest, JitGrant, RelationTuple } from './types';
import { ZanzibarTupleStore, zanzibarStore } from './ZanzibarTupleStore';
import { JIT_CONSTANTS } from './constants';
import { logger } from '../utils/logger';

/**
 * Ephemeral & Just-In-Time (JIT) Access Service.
 *
 * Implements Zero Standing Privileges (ZSP) architecture by provisioning short-lived,
 * audited, and automatically expiring permissions in the Zanzibar relationship graph.
 */
export class EphemeralAccessService {
  private requests: Map<string, JitAccessRequest> = new Map();
  private grants: Map<string, JitGrant> = new Map();

  constructor(private zanzibar: ZanzibarTupleStore = zanzibarStore) {}

  /**
   * Submits a new Just-In-Time access escalation request.
   *
   * @param params - Requested parameters including requesterId, justification, relations, and duration
   * @returns Newly created PENDING JitAccessRequest
   */
  createRequest(params: {
    requesterId: string;
    tenantId?: string;
    requestedRole?: any;
    requestedRelations: RelationTuple[];
    durationMinutes: number;
    justification: string;
    ticketId?: string;
  }): JitAccessRequest {
    if (!params.requesterId) {
      throw new Error('requesterId is required to submit a JIT access request');
    }
    if (!params.requestedRelations || params.requestedRelations.length === 0) {
      throw new Error('At least one RelationTuple is required for JIT access');
    }
    if (
      params.durationMinutes < JIT_CONSTANTS.MIN_DURATION_MINUTES ||
      params.durationMinutes > JIT_CONSTANTS.MAX_DURATION_MINUTES
    ) {
      throw new Error(
        `JIT duration must be between ${JIT_CONSTANTS.MIN_DURATION_MINUTES} and ${JIT_CONSTANTS.MAX_DURATION_MINUTES} minutes (8 hours max)`,
      );
    }
    if (!params.justification || params.justification.trim().length < JIT_CONSTANTS.MIN_JUSTIFICATION_LENGTH) {
      throw new Error(
        `A detailed business justification (minimum ${JIT_CONSTANTS.MIN_JUSTIFICATION_LENGTH} characters) is required for JIT elevation`,
      );
    }

    const request: JitAccessRequest = {
      id: `jit-req-${randomUUID()}`,
      requesterId: params.requesterId,
      tenantId: params.tenantId,
      requestedRole: params.requestedRole,
      requestedRelations: params.requestedRelations,
      durationMinutes: params.durationMinutes,
      justification: params.justification,
      ticketId: params.ticketId,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.requests.set(request.id, request);
    logger.info('JIT access request created', {
      service: 'msp-services',
      requestId: request.id,
      requesterId: request.requesterId,
      durationMinutes: request.durationMinutes,
      ticketId: request.ticketId,
    });

    return request;
  }

  /**
   * Approves a pending JIT request, transitioning it to APPROVED and minting a time-bounded JitGrant.
   * Dynamically injects granted relations into the Zanzibar relationship store.
   *
   * @param requestId - Target JIT request ID
   * @param approverId - Approving supervisor or automated system ID
   * @returns Active JitGrant record with calculated expiration timestamp
   */
  approveRequest(requestId: string, approverId: string): JitGrant {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`JIT access request "${requestId}" not found`);
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Cannot approve request in status "${request.status}"`);
    }

    request.status = 'APPROVED';

    const now = new Date();
    const expiresAt = new Date(now.getTime() + request.durationMinutes * 60 * 1000);

    const grant: JitGrant = {
      id: `jit-grant-${randomUUID()}`,
      requestId: request.id,
      granteeId: request.requesterId,
      tenantId: request.tenantId,
      grantedRelations: request.requestedRelations,
      grantedRole: request.requestedRole,
      approvedBy: approverId,
      issuedAt: now,
      expiresAt,
      status: 'ACTIVE',
    };

    this.grants.set(grant.id, grant);

    // Inject temporary tuples into the Zanzibar graph
    for (const tuple of grant.grantedRelations) {
      this.zanzibar.addTuple(tuple);
    }

    logger.info('JIT access grant issued and activated', {
      service: 'msp-services',
      grantId: grant.id,
      requestId: grant.requestId,
      granteeId: grant.granteeId,
      approvedBy: approverId,
      expiresAt: grant.expiresAt.toISOString(),
      tupleCount: grant.grantedRelations.length,
    });

    return grant;
  }

  /**
   * Denies a pending JIT access request.
   *
   * @param requestId - Target JIT request ID
   * @param reason - Reason for denial
   * @returns Updated JitAccessRequest with DENIED status
   */
  denyRequest(requestId: string, reason: string): JitAccessRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`JIT access request "${requestId}" not found`);
    }
    if (request.status !== 'PENDING') {
      throw new Error(`Cannot deny request in status "${request.status}"`);
    }

    request.status = 'DENIED';
    logger.info('JIT access request denied', {
      service: 'msp-services',
      requestId: request.id,
      reason,
    });

    return request;
  }

  /**
   * Manually revokes an active JIT grant prior to natural expiration (Break-Glass cleanup).
   * Removes all associated dynamic tuples from the Zanzibar graph.
   *
   * @param grantId - Target JIT grant ID
   * @param revokedBy - ID of user or admin revoking access
   * @returns Updated JitGrant with REVOKED status
   */
  revokeGrant(grantId: string, revokedBy: string): JitGrant {
    const grant = this.grants.get(grantId);
    if (!grant) {
      throw new Error(`JIT grant "${grantId}" not found`);
    }
    if (grant.status !== 'ACTIVE') {
      return grant;
    }

    grant.status = 'REVOKED';

    // Remove temporary tuples from the Zanzibar graph
    for (const tuple of grant.grantedRelations) {
      this.zanzibar.removeTuple(tuple);
    }

    logger.info('JIT access grant revoked manually', {
      service: 'msp-services',
      grantId: grant.id,
      revokedBy,
    });

    return grant;
  }

  /**
   * Sweeps all active grants and revokes/expires any whose expiration timestamp has passed.
   *
   * @returns Count of grants transitioned to EXPIRED
   */
  sweepExpiredGrants(): number {
    const now = new Date();
    let expiredCount = 0;

    for (const grant of this.grants.values()) {
      if (grant.status === 'ACTIVE' && grant.expiresAt.getTime() <= now.getTime()) {
        grant.status = 'EXPIRED';

        for (const tuple of grant.grantedRelations) {
          this.zanzibar.removeTuple(tuple);
        }

        expiredCount++;
        logger.info('JIT access grant expired and cleaned up', {
          service: 'msp-services',
          grantId: grant.id,
          granteeId: grant.granteeId,
        });
      }
    }

    return expiredCount;
  }

  /**
   * Retrieves all active grants, optionally filtered by grantee ID.
   *
   * @param granteeId - Optional user/subject ID filter
   * @returns Array of active JitGrant records
   */
  getActiveGrants(granteeId?: string): JitGrant[] {
    this.sweepExpiredGrants();
    const results: JitGrant[] = [];

    for (const grant of this.grants.values()) {
      if (grant.status === 'ACTIVE') {
        if (!granteeId || grant.granteeId === granteeId) {
          results.push(grant);
        }
      }
    }

    return results;
  }

  /**
   * Retrieves a specific request by ID.
   */
  getRequest(requestId: string): JitAccessRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Retrieves a specific grant by ID.
   */
  getGrant(grantId: string): JitGrant | undefined {
    return this.grants.get(grantId);
  }

  /**
   * Resets all internal stores (primarily for unit test isolation).
   */
  reset(): void {
    for (const grant of this.grants.values()) {
      if (grant.status === 'ACTIVE') {
        for (const tuple of grant.grantedRelations) {
          this.zanzibar.removeTuple(tuple);
        }
      }
    }
    this.requests.clear();
    this.grants.clear();
  }
}

export const ephemeralAccessService = new EphemeralAccessService();
