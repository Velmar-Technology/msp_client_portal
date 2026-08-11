import { Request, Response } from 'express';
import { planQueryService } from '../services/PlanQueryService';
import { planAdminService } from '../services/PlanAdminService';
import { CreatePlanInput, UpdatePlanInput, PlanQueryInput } from '../dtos/plan.dto';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../config/constants';
import { UserContext, UserRole } from '../types';

export class PlanController {
  private getUserContext(req: Request): UserContext {
    return {
      userId: req.user!.userId,
      role: req.user!.role as UserRole,
      tenantId: req.user!.tenantId,
    };
  }

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

  async getById(req: Request, res: Response): Promise<void> {
    const plan = await planQueryService.getPlanById(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: plan });
  }

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreatePlanInput;
    const plan = await planAdminService.createPlan(data, this.getUserContext(req));
    res.status(201).json({ success: true, data: plan });
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdatePlanInput;
    const plan = await planAdminService.updatePlan(req.params.id as string, data, this.getUserContext(req));
    res.json({ success: true, data: plan });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const plan = await planAdminService.softDeletePlan(req.params.id as string, this.getUserContext(req));
    res.json({ success: true, data: plan });
  }
}

export const planController = new PlanController();
