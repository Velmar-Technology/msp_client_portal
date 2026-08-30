import {
  AuthzContext,
  AuthzDecision,
} from './types';
import { UserRole } from '@shared/types';
import { ZanzibarTupleStore, zanzibarStore } from './ZanzibarTupleStore';
import { PolicyAsCodeEngine, policyAsCodeEngine } from './PolicyAsCodeEngine';
import { EphemeralAccessService, ephemeralAccessService } from './EphemeralAccessService';
import { WorkloadIdentityService, workloadIdentityService } from './WorkloadIdentityService';
import { ContinuousAdaptiveTrustService, continuousAdaptiveTrustService } from './ContinuousAdaptiveTrustService';
import { AUTHZ_ACTION_MAPPINGS } from './constants';

/**
 * Unified SOTA Hybrid Authorization Engine (PDP).
 * Orchestrates coarse-grained RBAC, fine-grained ReBAC graph traversals,
 * dynamic ABAC contextual evaluations, Workload Identity, and Contextual Step-Up MFA.
 */
export class HybridPolicyEngine {
  constructor(
    private zanzibar: ZanzibarTupleStore = zanzibarStore,
    private pacEngine: PolicyAsCodeEngine = policyAsCodeEngine,
    private jitService: EphemeralAccessService = ephemeralAccessService,
    private workloadService: WorkloadIdentityService = workloadIdentityService,
    private trustService: ContinuousAdaptiveTrustService = continuousAdaptiveTrustService,
  ) {}

  /**
   * Evaluates an authorization request through the multi-layer hybrid pipeline.
   *
   * @param ctx - Complete authorization context payload
   * @returns AuthzDecision determining whether the operation is permitted
   */
  async evaluate(ctx: AuthzContext): Promise<AuthzDecision> {
    const { subject, action, resource, environment } = ctx;

    // -------------------------------------------------------------
    // LAYER 0: Workload / Non-Human Identity (Machine-to-Machine)
    // -------------------------------------------------------------
    if (subject.type === 'service_account' || subject.type === 'agent') {
      const claims = subject.attributes?.workloadClaims as any;
      if (claims) {
        const authorized = this.workloadService.isAuthorized(claims, action, `${resource.type}:${resource.id}`);
        if (!authorized) {
          return {
            allowed: false,
            reason: `Workload "${claims.spiffeId}" not authorized for action "${action}" on "${resource.type}:${resource.id}"`,
          };
        }
        return {
          allowed: true,
          reason: `Authorized via Cryptographic Workload Identity (${claims.spiffeId})`,
        };
      }
    }

    // -------------------------------------------------------------
    // LAYER 1: RBAC Baseline Evaluation
    // -------------------------------------------------------------
    // Admins bypass standard identity role checks unless explicit PaC policy denies
    if (subject.role === UserRole.ADMIN) {
      const pacResult = await this.pacEngine.evaluate(ctx);
      if (!pacResult.allowed && pacResult.violatedPolicy?.startsWith('PAC-NONPAYMENT')) {
        return pacResult;
      }
      return { allowed: true, reason: 'Granted via Global Admin Role' };
    }

    // Role-action boundary matrix
    if (subject.role === UserRole.CLIENT) {
      const allowedClientActions: readonly string[] = AUTHZ_ACTION_MAPPINGS.ALLOWED_CLIENT_ACTIONS;
      if (!allowedClientActions.includes(action)) {
        return {
          allowed: false,
          reason: `Role ${subject.role} is not permitted to perform action "${action}"`,
        };
      }
    }

    // -------------------------------------------------------------
    // LAYER 2: ReBAC Fine-Grained Graph Traversal (Zanzibar + JIT)
    // -------------------------------------------------------------
    // Periodically sweep any expired JIT grants
    this.jitService.sweepExpiredGrants();

    const subjectKey = `user:${subject.id}`;
    const resourceKey = `${resource.type}:${resource.id}`;

    // Map action to required relation
    const targetRelation = AUTHZ_ACTION_MAPPINGS.ACTION_RELATION_MAP[action] || 'viewer';

    // Direct object relation check OR direct ownership/assignment check in attributes
    let hasGraphAccess = this.zanzibar.check(subjectKey, targetRelation, resourceKey);

    // Fallback to resource attribute ownership if tuples were registered dynamically
    if (!hasGraphAccess) {
      if (action === 'create') {
        if (!resource.tenantId || (subject.tenantId && resource.tenantId === subject.tenantId)) {
          hasGraphAccess = true;
        }
      } else if (resource.ownerId === subject.id) {
        hasGraphAccess = true;
      } else if (
        resource.attributes?.assignedTechId === subject.id &&
        ['viewer', 'editor'].includes(targetRelation)
      ) {
        hasGraphAccess = true;
      } else if (
        resource.tenantId &&
        subject.tenantId &&
        resource.tenantId === subject.tenantId &&
        ['viewer', 'editor', 'owner'].includes(targetRelation)
      ) {
        // If client owns resource or is tenant member
        if (subject.role === UserRole.CLIENT && (resource.ownerId === subject.id || !resource.ownerId)) {
          hasGraphAccess = true;
        } else if (subject.role === UserRole.TECHNICIAN) {
          hasGraphAccess = true;
        }
      }
    }

    if (!hasGraphAccess) {
      return {
        allowed: false,
        reason: `Subject "${subjectKey}" lacks relation "${targetRelation}" on resource "${resourceKey}"`,
      };
    }

    // -------------------------------------------------------------
    // LAYER 3: ABAC Dynamic & Environmental Predicates (Policy-as-Code)
    // -------------------------------------------------------------
    const pacDecision = await this.pacEngine.evaluate(ctx);
    if (!pacDecision.allowed) {
      return pacDecision;
    }

    // -------------------------------------------------------------
    // LAYER 4: Contextual & Behavioral Step-Up Verification
    // -------------------------------------------------------------
    if (environment?.deviceCompliant === false) {
      const isVerified = this.trustService.isStepUpVerified(subject.id, action, resource.id);
      if (!isVerified) {
        return {
          allowed: false,
          requiredStepUpMfa: true,
          reason: 'Contextual risk: Non-compliant device requires Step-Up MFA verification',
        };
      }
    }

    return {
      allowed: true,
      reason: 'Authorized via Hybrid RBAC + ReBAC + ABAC Pipeline',
    };
  }

  /**
   * Helper to register a relationship edge in the graph.
   *
   * @param subjectId - User or Agent ID
   * @param relation - Relation name (e.g. 'owner', 'assigned_technician')
   * @param resourceType - Resource type (e.g. 'ticket', 'invoice')
   * @param resourceId - Resource ID
   */
  grantRelation(
    subjectId: string,
    relation: string,
    resourceType: string,
    resourceId: string,
  ): void {
    this.zanzibar.addTuple({
      subject: `user:${subjectId}`,
      relation,
      object: `${resourceType}:${resourceId}`,
    });
  }

  /**
   * Helper to revoke a relationship edge from the graph.
   */
  revokeRelation(
    subjectId: string,
    relation: string,
    resourceType: string,
    resourceId: string,
  ): void {
    this.zanzibar.removeTuple({
      subject: `user:${subjectId}`,
      relation,
      object: `${resourceType}:${resourceId}`,
    });
  }
}

export const hybridPolicyEngine = new HybridPolicyEngine();
