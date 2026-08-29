import { Plan, UserContext, UserRole } from '@shared/types';
import { ForbiddenError } from '@shared/errors';

/**
 * Policy enforcing role-based plan administration, inactive plan visibility, and subscription eligibility.
 */
export class PlanAccessPolicy {
  /**
   * Asserts that the authenticated context has permission to mutate service plans.
   *
   * @param ctx - UserContext
   * @throws {ForbiddenError} When user is not an administrator
   */
  assertAdminMutation(ctx: UserContext): void {
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can manage plans');
    }
  }

  /**
   * Evaluates if the authenticated context is permitted to view archived/inactive plans.
   *
   * @param ctx - UserContext
   * @returns True if admin or technician, false otherwise
   */
  canViewInactive(ctx: UserContext): boolean {
    return ctx.role === UserRole.ADMIN || ctx.role === UserRole.TECHNICIAN;
  }

  /**
   * Asserts that a plan is active or that the user has elevated privileges to view inactive plans.
   *
   * @param plan - Plan entity
   * @param ctx - UserContext
   * @throws {ForbiddenError} When a client tries to view an inactive plan
   */
  assertActivePlan(plan: Plan, ctx: UserContext): void {
    if (!this.canViewInactive(ctx) && plan.active === false) {
      throw new ForbiddenError('This plan is not available');
    }
  }
}

export const planAccessPolicy = new PlanAccessPolicy();
