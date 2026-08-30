import { AuthzContext, AuthzDecision, PolicyRule } from './types';
import { UserRole } from '@shared/types';
import { SLA_WINDOW_MS } from '@shared/config/constants';
import { calculateElapsedBusinessMs } from '@shared/utils/businessHours';

/**
 * Declarative Policy-as-Code (PaC) Engine.
 * Evaluates versioned, auditable policy rules against context payloads.
 */
export class PolicyAsCodeEngine {
  private rules: Map<string, PolicyRule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Registers a declarative policy rule into the engine.
   *
   * @param rule - The policy rule definition
   */
  registerRule(rule: PolicyRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Removes a policy rule by ID.
   *
   * @param ruleId - The unique identifier of the rule to remove
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Retrieves all registered rules for a given resource type and action.
   *
   * @param resourceType - Target resource domain
   * @param action - Action being evaluated
   * @returns Array of matched rules sorted by priority (descending)
   */
  getMatchingRules(resourceType: string, action: string): PolicyRule[] {
    const matched: PolicyRule[] = [];
    for (const rule of this.rules.values()) {
      if (
        (rule.resourceType === '*' || rule.resourceType === resourceType) &&
        (rule.actions.includes('*') || rule.actions.includes(action))
      ) {
        matched.push(rule);
      }
    }
    return matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /**
   * Evaluates all applicable declarative rules against the given authorization context.
   *
   * Evaluation strategy:
   * 1. Any matching DENY rule that evaluates to true immediately rejects access.
   * 2. At least one matching ALLOW rule must evaluate to true for access to be granted.
   *
   * @param ctx - Complete authorization context
   * @returns AuthzDecision result
   */
  async evaluate(ctx: AuthzContext): Promise<AuthzDecision> {
    const matchingRules = this.getMatchingRules(ctx.resource.type, ctx.action);

    if (matchingRules.length === 0) {
      return {
        allowed: false,
        reason: `No applicable policy rules found for resource ${ctx.resource.type} and action ${ctx.action}`,
      };
    }

    let hasAllow = false;

    for (const rule of matchingRules) {
      const conditionPassed = await rule.evaluator(ctx);

      if (rule.effect === 'DENY' && conditionPassed) {
        return {
          allowed: false,
          reason: `Access explicitly denied by policy rule: ${rule.name} (v${rule.version})`,
          violatedPolicy: rule.id,
        };
      }

      if (rule.effect === 'ALLOW' && conditionPassed) {
        hasAllow = true;
      }
    }

    // In open evaluation (or hybrid mode), if no DENY rule triggered and there are no restrictive ALLOW-only rules or an ALLOW passed:
    const hasOnlyDenyRules = matchingRules.every((r) => r.effect === 'DENY');

    if (hasAllow || hasOnlyDenyRules) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'No permissive policy rule evaluated to true for this operation',
    };
  }

  /**
   * Registers default core system policies.
   */
  private registerDefaultRules(): void {
    // 1. Multi-Tenant Boundary Isolation Rule (High Priority Deny)
    this.registerRule({
      id: 'PAC-TENANT-ISOLATION-001',
      name: 'Multi-Tenant Isolation Boundary',
      version: '1.0.0',
      resourceType: '*',
      actions: ['*'],
      effect: 'DENY',
      priority: 1000,
      evaluator: (ctx) => {
        // Admins bypass tenant restriction
        if (ctx.subject.role === UserRole.ADMIN) {
          return false;
        }
        // If resource has a tenant, subject must match
        if (ctx.resource.tenantId && ctx.subject.tenantId) {
          return ctx.resource.tenantId !== ctx.subject.tenantId;
        }
        return false;
      },
    });

    // 2. SLA 1-Hour Ticket Cancellation Rule (BL-101)
    this.registerRule({
      id: 'PAC-SLA-CANCELLATION-BL101',
      name: '1-Hour SLA Cancellation Boundary',
      version: '1.2.0',
      resourceType: 'ticket',
      actions: ['cancel', 'update_status_cancelled'],
      effect: 'DENY',
      priority: 900,
      evaluator: (ctx) => {
        if (ctx.subject.role === UserRole.ADMIN) {
          return false;
        }
        const createdAt = ctx.resource.attributes?.createdAt as string | Date | undefined;
        if (!createdAt) {
          return false;
        }
        const elapsed = calculateElapsedBusinessMs(new Date(createdAt));
        return elapsed > SLA_WINDOW_MS;
      },
    });

    // 3. Non-Payment Scale Mutation Guard (BL-702)
    this.registerRule({
      id: 'PAC-NONPAYMENT-GUARD-BL702',
      name: 'Non-Payment Account Status Read-Only and Suspension Guard',
      version: '1.0.0',
      resourceType: '*',
      actions: ['create', 'update', 'delete', 'write', 'execute_command', 'cancel'],
      effect: 'DENY',
      priority: 950,
      evaluator: (ctx) => {
        if (ctx.subject.role === UserRole.ADMIN) {
          return false;
        }
        const status = ctx.environment?.accountStatus;
        if (status === 'SUSPENDED' || status === 'PURGED') {
          return true; // Deny all operations
        }
        if (status === 'READ_ONLY' && !['read', 'view', 'list'].includes(ctx.action)) {
          return true; // Deny write mutations
        }
        return false;
      },
    });

    // 4. Admin Universal Grant
    this.registerRule({
      id: 'PAC-ADMIN-GLOBAL-ALLOW',
      name: 'Admin Universal Allow Rule',
      version: '1.0.0',
      resourceType: '*',
      actions: ['*'],
      effect: 'ALLOW',
      priority: 100,
      evaluator: (ctx) => ctx.subject.role === UserRole.ADMIN,
    });

    // 5. Baseline Subject Allow Rule (permits evaluated operations unless denied by higher priority DENY rules)
    this.registerRule({
      id: 'PAC-STANDARD-SUBJECT-ALLOW',
      name: 'Standard Subject Base Allow Rule',
      version: '1.0.0',
      resourceType: '*',
      actions: ['*'],
      effect: 'ALLOW',
      priority: 10,
      evaluator: (ctx) => Boolean(ctx.subject.id),
    });
  }
}

export const policyAsCodeEngine = new PolicyAsCodeEngine();
