import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { planAccessPolicy, PlanAccessPolicy } from '@shared/policies/PlanAccessPolicy';
import { NotFoundError } from '@shared/errors';
import { Plan, PlanFilters, UserContext } from '@shared/types';

/**
 * Domain service providing filtered and role-authorized plan listing and details queries.
 */
export class PlanQueryService {
  /**
   * Initializes PlanQueryService with plan repository and access policy dependencies.
   *
   * @param planRepo - Plan repository
   * @param accessPol - Plan access policy
   */
  constructor(
    private planRepo: PlanRepository = planRepository,
    private accessPol: PlanAccessPolicy = planAccessPolicy,
  ) {}

  /**
   * Lists catalog plans with optional active/inactive visibility based on user role permissions.
   *
   * @param filters - Pagination and search filters
   * @param ctx - Authenticated user context
   * @returns Object containing plans array and total count
   */
  async listPlans(filters: PlanFilters, ctx: UserContext): Promise<{ plans: Plan[]; total: number }> {
    const includeInactive = this.accessPol.canViewInactive(ctx);
    return this.planRepo.findWithFilters({ ...filters, includeInactive });
  }

  /**
   * Retrieves a single plan by ID with active status authorization enforcement.
   *
   * @param id - Plan UUID or string ID
   * @param ctx - Authenticated user context
   * @returns Plan entity
   * @throws {NotFoundError} When plan is not found
   * @throws {ForbiddenError} When inactive plan requested by non-admin
   */
  async getPlanById(id: string, ctx: UserContext): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }
    this.accessPol.assertActivePlan(plan, ctx);
    return plan;
  }
}

export const planQueryService = new PlanQueryService();
