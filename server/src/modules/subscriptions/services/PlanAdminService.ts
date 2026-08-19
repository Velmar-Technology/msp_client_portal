import { planRepository, PlanRepository } from '@modules/subscriptions/repositories/PlanRepository';
import { planAccessPolicy, PlanAccessPolicy } from '@shared/policies/PlanAccessPolicy';
import { NotFoundError, ConflictError, InternalServerError } from '@shared/errors';
import { Plan, PlanClientType, UserContext } from '@shared/types';
import { CreatePlanInput, UpdatePlanInput } from '@shared/dtos/plan.dto';

export class PlanAdminService {
  constructor(
    private planRepo: PlanRepository = planRepository,
    private accessPol: PlanAccessPolicy = planAccessPolicy,
  ) {}

  async createPlan(data: CreatePlanInput, ctx: UserContext): Promise<Plan> {
    this.accessPol.assertAdminMutation(ctx);
    const existing = await this.planRepo.findById(data.id);
    if (existing) {
      throw new ConflictError(`Plan with ID '${data.id}' already exists`);
    }

    return this.planRepo.create({
      id: data.id,
      name: data.name,
      description: data.description || null,
      price: data.price,
      features: data.features || [],
      recommended: data.recommended || false,
      client_type: data.client_type || PlanClientType.CLIENT,
      active: data.active !== undefined ? data.active : true,
    });
  }

  async updatePlan(id: string, data: UpdatePlanInput, ctx: UserContext): Promise<Plan> {
    this.accessPol.assertAdminMutation(ctx);
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    const updated = await this.planRepo.update(id, data);
    if (!updated) {
      throw new InternalServerError('Failed to update plan');
    }
    return updated;
  }

  async softDeletePlan(id: string, ctx: UserContext): Promise<Plan> {
    this.accessPol.assertAdminMutation(ctx);
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new NotFoundError('Plan not found');
    }

    const updated = await this.planRepo.update(id, { active: false });
    if (!updated) {
      throw new InternalServerError('Failed to soft delete plan');
    }
    return updated;
  }
}

export const planAdminService = new PlanAdminService();
