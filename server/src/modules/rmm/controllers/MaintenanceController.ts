import { Request, Response } from 'express';
import { maintenanceService } from '@modules/rmm/services/MaintenanceService';
import { CreateMaintenanceDTO, UpdateMaintenanceDTO, MaintenanceQueryDTO } from '@shared/dtos/maintenance.dto';

/**
 * Controller handling HTTP requests for device preventative maintenance scheduling and tracking.
 */
export class MaintenanceController {
  /**
   * Handles querying preventative maintenance schedules with filters.
   *
   * @param req - Express request with query parameters
   * @param res - Express response returning array of maintenance items
   */
  async getAll(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handles retrieving a single maintenance schedule by UUID.
   *
   * @param req - Express request with maintenance ID in params
   * @param res - Express response returning maintenance item
   */
  async getById(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handles scheduling a preventative maintenance window.
   *
   * @param req - Express request with CreateMaintenanceDTO body
   * @param res - Express response returning HTTP 201 with scheduled item
   */
  async create(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handles updating a maintenance schedule (rescheduling or completing).
   *
   * @param req - Express request with maintenance ID in params and UpdateMaintenanceDTO body
   * @param res - Express response returning updated maintenance item
   */
  async update(req: Request, res: Response): Promise<void> {
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
  }

  /**
   * Handles deleting a maintenance schedule.
   *
   * @param req - Express request with maintenance ID in params
   * @param res - Express response returning deletion success status
   */
  async delete(req: Request, res: Response): Promise<void> {
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
  }
}

export const maintenanceController = new MaintenanceController();
