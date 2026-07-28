import { Request, Response, NextFunction } from 'express';
import { maintenanceService } from '../services/MaintenanceService';
import { CreateMaintenanceDTO, UpdateMaintenanceDTO, MaintenanceQueryDTO } from '../dtos/maintenance.dto';

export class MaintenanceController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = MaintenanceQueryDTO.parse(req.query);
      const items = await maintenanceService.getMaintenances(
        req.user!.tenantId,
        { id: req.user!.userId, role: req.user!.role },
        query
      );
      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const item = await maintenanceService.getMaintenanceById(
        id,
        req.user!.tenantId,
        { id: req.user!.userId, role: req.user!.role }
      );
      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = CreateMaintenanceDTO.parse(req.body);
      const item = await maintenanceService.scheduleMaintenance(
        req.user!.tenantId,
        { id: req.user!.userId, role: req.user!.role },
        dto
      );
      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const dto = UpdateMaintenanceDTO.parse(req.body);
      const item = await maintenanceService.updateMaintenance(
        req.user!.tenantId,
        { id: req.user!.userId, role: req.user!.role },
        id,
        dto
      );
      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const result = await maintenanceService.deleteMaintenance(
        req.user!.tenantId,
        { id: req.user!.userId, role: req.user!.role },
        id
      );
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const maintenanceController = new MaintenanceController();
