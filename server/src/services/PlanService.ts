import { planRepository } from '../repositories/PlanRepository';
import { AppError } from '../utils/AppError';
import { Plan } from '../types';
import { CreatePlanInput, UpdatePlanInput } from '../dtos/plan.dto';

export class PlanService {
  async getAllPlans(includeInactive = false): Promise<Plan[]> {
    const plans = await planRepository.findAll(100, 0);
    const sorted = plans.sort((a, b) => a.price - b.price);
    if (includeInactive) return sorted;
    return sorted.filter((p) => p.active !== false);
  }

  async getPlanById(id: string): Promise<Plan> {
    const plan = await planRepository.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');
    return plan;
  }

  async createPlan(data: CreatePlanInput): Promise<Plan> {
    const existing = await planRepository.findById(data.id);
    if (existing) {
      throw AppError.conflict(`Plan with ID '${data.id}' already exists`);
    }

    const plan = await planRepository.create({
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
    const plan = await planRepository.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');

    const updated = await planRepository.update(id, data);
    if (!updated) throw AppError.internal('Failed to update plan');
    return updated;
  }

  async softDeletePlan(id: string): Promise<Plan> {
    const plan = await planRepository.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');

    const updated = await planRepository.update(id, { active: false });
    if (!updated) throw AppError.internal('Failed to soft delete plan');
    return updated;
  }
}

export const planService = new PlanService();
