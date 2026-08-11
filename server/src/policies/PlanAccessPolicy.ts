import { Plan, UserContext, UserRole } from '../types';
import { AppError } from '../utils/AppError';

export class PlanAccessPolicy {
  assertAdminMutation(ctx: UserContext): void {
    if (ctx.role !== UserRole.ADMIN) {
      throw AppError.forbidden('Only administrators can manage plans');
    }
  }

  canViewInactive(ctx: UserContext): boolean {
    return ctx.role === UserRole.ADMIN || ctx.role === UserRole.TECHNICIAN;
  }

  assertActivePlan(plan: Plan, ctx: UserContext): void {
    if (!this.canViewInactive(ctx) && plan.active === false) {
      throw AppError.forbidden('This plan is not available');
    }
  }
}

export const planAccessPolicy = new PlanAccessPolicy();
