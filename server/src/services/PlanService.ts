import { planRepository } from '../repositories/PlanRepository';
import { AppError } from '../utils/AppError';
import { Plan } from '../types';
import { UpdatePlanInput } from '../dtos/plan.dto';

export class PlanService {
  async getAllPlans(): Promise<Plan[]> {
    const plans = await planRepository.findAll(100, 0);
    // Sort plans by price ascending: BASIC -> STANDARD -> PREMIUM
    return plans.sort((a, b) => a.price - b.price);
  }

  async getPlanById(id: string): Promise<Plan> {
    const plan = await planRepository.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');
    return plan;
  }

  async updatePlan(id: string, data: UpdatePlanInput): Promise<Plan> {
    const plan = await planRepository.findById(id);
    if (!plan) throw AppError.notFound('Plan not found');

    const updated = await planRepository.update(id, data);
    if (!updated) throw AppError.internal('Failed to update plan');
    return updated;
  }
}

export const planService = new PlanService();
