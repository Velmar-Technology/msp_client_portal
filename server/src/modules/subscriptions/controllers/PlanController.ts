import { Request, Response } from 'express';
import { planQueryService } from '@modules/subscriptions/services/PlanQueryService';
import { planAdminService } from '@modules/subscriptions/services/PlanAdminService';
import { CreatePlanInput, UpdatePlanInput, PlanQueryInput } from '@shared/dtos/plan.dto';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@shared/config/constants';
import { UserContext, UserRole } from '@shared/types';

/**
 * Controller handling HTTP requests for subscription plan catalog queries and admin CRUD management.
 */
export class PlanController {
  /**
   * Extracts authenticated UserContext from Express request.
   *
   * @param req - Express request
   * @returns UserContext object
   */
  private getUserContext(req: Request): UserContext {
    return {
      userId: req.user!.userId,
      role: req.user!.role as UserRole,
      tenantId: req.user!.tenantId,
    };
  }

  /**
   * Handles listing plans with search/client-type filters and pagination.
   *
   * @param req - Express request with query parameters
   * @param res - Express response returning plans array and pagination metadata
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const filters = req.query as unknown as PlanQueryInput;
    const { plans, total } = await planQueryService.listPlans(filters, this.getUserContext(req));

    const page = filters.page || DEFAULT_PAGE;
    const limit = filters.limit || DEFAULT_LIMIT;

    res.json({
      success: true,
      data: plans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  /**
   * Handles retrieving a single plan by string ID or UUID.
   *
   * @param req - Express request with plan ID in params
   * @param res - Express response returning plan details
   */
  async getById(req: Request, res: Response): Promise<void> {
    const plan = await planQueryService.getPlanById(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: plan });
  }

  /**
   * Handles creating a new pricing plan tier.
   *
   * @param req - Express request with CreatePlanInput body
   * @param res - Express response returning HTTP 201 with created plan
   */
  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreatePlanInput;
    const plan = await planAdminService.createPlan(data, this.getUserContext(req));
    res.status(201).json({ success: true, data: plan });
  }

  /**
   * Handles updating an existing plan tier.
   *
   * @param req - Express request with plan ID in params and UpdatePlanInput body
   * @param res - Express response returning updated plan
   */
  async update(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdatePlanInput;
    const plan = await planAdminService.updatePlan(req.params.id as string, data, this.getUserContext(req));
    res.json({ success: true, data: plan });
  }

  /**
   * Handles soft-deleting a plan tier by deactivating it.
   *
   * @param req - Express request with plan ID in params
   * @param res - Express response returning deactivated plan
   */
  async delete(req: Request, res: Response): Promise<void> {
    const plan = await planAdminService.softDeletePlan(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: plan });
  }
}

export const planController = new PlanController();
