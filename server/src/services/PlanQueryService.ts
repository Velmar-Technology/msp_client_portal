import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { planAccessPolicy, PlanAccessPolicy } from '../policies/PlanAccessPolicy';
import { AppError } from '../utils/AppError';
import { Plan, PlanFilters, UserContext } from '../types';

export class PlanQueryService {
  constructor(
    private planRepo: PlanRepository = planRepository,
    private accessPol: PlanAccessPolicy = planAccessPolicy,
  ) {}

  async listPlans(filters: PlanFilters, ctx: UserContext): Promise<{ plans: Plan[]; total: number }> {
    const includeInactive = this.accessPol.canViewInactive(ctx);
    return this.planRepo.findWithFilters({ ...filters, includeInactive });
  }

  async getPlanById(id: string, ctx: UserContext): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw AppError.notFound('Plan not found');
    }
    this.accessPol.assertActivePlan(plan, ctx);
    return plan;
  }
}

export const planQueryService = new PlanQueryService();
