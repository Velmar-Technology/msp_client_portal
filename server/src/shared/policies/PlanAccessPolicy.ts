import { Plan, UserContext, UserRole } from '@shared/types';
import { ForbiddenError } from '@shared/errors';

export class PlanAccessPolicy {
  assertAdminMutation(ctx: UserContext): void {
    if (ctx.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can manage plans');
    }
  }

  canViewInactive(ctx: UserContext): boolean {
    return ctx.role === UserRole.ADMIN || ctx.role === UserRole.TECHNICIAN;
  }

  assertActivePlan(plan: Plan, ctx: UserContext): void {
    if (!this.canViewInactive(ctx) && plan.active === false) {
      throw new ForbiddenError('This plan is not available');
    }
  }
}

export const planAccessPolicy = new PlanAccessPolicy();
