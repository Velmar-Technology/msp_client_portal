import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { planAccessPolicy, PlanAccessPolicy } from '@shared/policies/PlanAccessPolicy';
import { NotFoundError, ConflictError, InternalServerError } from '@shared/errors';
import { Plan, PlanClientType, UserContext } from '@shared/types';
import { CreatePlanInput, UpdatePlanInput } from '@shared/dtos/plan.dto';

/**
 * Domain service managing plan catalog CRUD operations, administrative access assertions, and soft deletions.
 */
export class PlanAdminService {
  /**
   * Initializes PlanAdminService with plan repository and access policy dependencies.
   *
   * @param planRepo - Plan repository
   * @param accessPol - Plan access policy
   */
  constructor(
    private planRepo: PlanRepository = planRepository,
    private accessPol: PlanAccessPolicy = planAccessPolicy,
  ) {}

  /**
   * Creates a new pricing plan tier (Admin only).
   *
   * @param data - CreatePlanInput attributes
   * @param ctx - Authenticated user context
   * @returns Created Plan entity
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {ConflictError} When plan with the requested ID already exists
   */
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

  /**
   * Updates existing plan attributes (Admin only).
   *
   * @param id - Plan ID
   * @param data - UpdatePlanInput attributes
   * @param ctx - Authenticated user context
   * @returns Updated Plan entity
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {NotFoundError} When plan is not found
   * @throws {InternalServerError} When database update fails
   */
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

  /**
   * Soft-deletes a plan by deactivating it (Admin only).
   *
   * @param id - Plan ID
   * @param ctx - Authenticated user context
   * @returns Updated Plan entity with active = false
   * @throws {ForbiddenError} When user is not an administrator
   * @throws {NotFoundError} When plan is not found
   * @throws {InternalServerError} When database update fails
   */
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
