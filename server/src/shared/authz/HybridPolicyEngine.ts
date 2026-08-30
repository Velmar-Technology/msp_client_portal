import {
  AuthzContext,
  AuthzDecision,
} from './types';
import { UserRole } from '@shared/types';
import { ZanzibarTupleStore, zanzibarStore } from './ZanzibarTupleStore';
import { PolicyAsCodeEngine, policyAsCodeEngine } from './PolicyAsCodeEngine';

/**
 * Unified SOTA Hybrid Authorization Engine (PDP).
 * Orchestrates coarse-grained RBAC, fine-grained ReBAC graph traversals,
 * and dynamic ABAC contextual evaluations into a single low-latency decision pipeline.
 */
export class HybridPolicyEngine {
  constructor(
    private zanzibar: ZanzibarTupleStore = zanzibarStore,
    private pacEngine: PolicyAsCodeEngine = policyAsCodeEngine,
  ) {}

  /**
   * Evaluates an authorization request through the 3-layer hybrid pipeline.
   *
   * @param ctx - Complete authorization context payload
   * @returns AuthzDecision determining whether the operation is permitted
   */
  async evaluate(ctx: AuthzContext): Promise<AuthzDecision> {
    const { subject, action, resource } = ctx;

    // -------------------------------------------------------------
    // LAYER 1: RBAC Baseline Evaluation
    // -------------------------------------------------------------
    // Admins bypass standard identity role checks
    if (subject.role === UserRole.ADMIN) {
      // Evaluate against explicit PaC DENY rules first (e.g. Purged accounts)
      const pacResult = await this.pacEngine.evaluate(ctx);
      if (!pacResult.allowed && pacResult.violatedPolicy?.startsWith('PAC-NONPAYMENT')) {
        return pacResult;
      }
      return { allowed: true, reason: 'Granted via Global Admin Role' };
    }

    // Role-action boundary matrix
    if (subject.role === UserRole.CLIENT) {
      const allowedClientActions = ['read', 'list', 'create', 'cancel', 'comment', 'view'];
      if (!allowedClientActions.includes(action)) {
        return {
          allowed: false,
          reason: `Role ${subject.role} is not permitted to perform action "${action}"`,
        };
      }
    }

    // -------------------------------------------------------------
    // LAYER 2: ReBAC Fine-Grained Graph Traversal (Zanzibar)
    // -------------------------------------------------------------
    const subjectKey = `user:${subject.id}`;
    const resourceKey = `${resource.type}:${resource.id}`;

    // Map action to required relation
    const actionRelationMap: Record<string, string> = {
      read: 'viewer',
      view: 'viewer',
      list: 'viewer',
      comment: 'viewer',
      update: 'editor',
      write: 'editor',
      cancel: 'owner',
      delete: 'owner',
      assign: 'admin',
    };

    const targetRelation = actionRelationMap[action] || 'viewer';

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
