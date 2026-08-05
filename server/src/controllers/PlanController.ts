import { Request, Response } from 'express';
import { planService } from '../services/PlanService';
import { CreatePlanInput, UpdatePlanInput } from '../dtos/plan.dto';

export class PlanController {
  async getAll(req: Request, res: Response): Promise<void> {
    const includeInactive = req.user?.role === 'ADMIN' || req.user?.role === 'TECHNICIAN';
    const plans = await planService.getAllPlans(includeInactive);
    res.json({ success: true, data: plans });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const plan = await planService.getPlanById(req.params.id as string);
    res.json({ success: true, data: plan });
  }

  async create(req: Request, res: Response): Promise<void> {
    const data = req.body as CreatePlanInput;
    const plan = await planService.createPlan(data);
    res.status(201).json({ success: true, data: plan });
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdatePlanInput;
    const plan = await planService.updatePlan(req.params.id as string, data);
    res.json({ success: true, data: plan });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const plan = await planService.softDeletePlan(req.params.id as string);
    res.json({ success: true, data: plan });
  }
}

export const planController = new PlanController();
