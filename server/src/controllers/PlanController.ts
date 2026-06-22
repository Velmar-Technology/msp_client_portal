import { Request, Response } from 'express';
import { planService } from '../services/PlanService';
import { UpdatePlanInput } from '../dtos/plan.dto';

export class PlanController {
  async getAll(_req: Request, res: Response): Promise<void> {
    const plans = await planService.getAllPlans();
    res.json({ success: true, data: plans });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const plan = await planService.getPlanById(req.params.id as string);
    res.json({ success: true, data: plan });
  }

  async update(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdatePlanInput;
    const plan = await planService.updatePlan(req.params.id as string, data);
    res.json({ success: true, data: plan });
  }
}

export const planController = new PlanController();
