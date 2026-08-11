import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { AppError } from '../utils/AppError';
import { Plan } from '../types';
import { CreatePlanInput, UpdatePlanInput } from '../dtos/plan.dto';

export class PlanService {
  constructor(private planRepo: PlanRepository = planRepository) {}
  async getAllPlans(includeInactive = false): Promise<Plan[]> {
    const plans = await this.planRepo.findAll(100, 0);
    const sorted = plans.sort((a, b) => a.price - b.price);
    if (includeInactive) return sorted;
    return sorted.filter((p) => p.active !== false);
  }

  async getPlanById(id: string): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');
    return plan;
  }

  async createPlan(data: CreatePlanInput): Promise<Plan> {
    const existing = await this.planRepo.findById(data.id);
    if (existing) {
      throw AppError.conflict(`Plan with ID '${data.id}' already exists`);
    }

    const plan = await this.planRepo.create({
      id: data.id,
      name: data.name,
      description: data.description || null,
      price: data.price,
      features: data.features || [],
      recommended: data.recommended || false,
      client_type: data.client_type || 'CLIENT',
      active: data.active !== undefined ? data.active : true,
    });
    return plan;
  }

  async updatePlan(id: string, data: UpdatePlanInput): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');

    const updated = await this.planRepo.update(id, data);
    if (!updated) throw AppError.internal('Failed to update plan');
    return updated;
  }

  async softDeletePlan(id: string): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');

    const updated = await this.planRepo.update(id, { active: false });
    if (!updated) throw AppError.internal('Failed to soft delete plan');
    return updated;
  }
}

export const planService = new PlanService();
