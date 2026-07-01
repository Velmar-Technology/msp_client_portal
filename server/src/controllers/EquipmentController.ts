import { Request, Response, NextFunction } from 'express';
import { equipmentService } from '../services/EquipmentService';

export class EquipmentController {
  async getSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subId = req.params.subId as string;
      const slots = await equipmentService.getEquipmentSlots(subId, req.user!.tenantId);
      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      next(error);
    }
  }

  async generateOTP(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subId = req.params.subId as string;
      const slotIndex = parseInt(req.params.slotIndex as string, 10);
      const slot = await equipmentService.generateSlotOTP(subId, slotIndex, req.user!.tenantId);
      res.json({
        success: true,
        data: slot,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subId = req.params.subId as string;
      const slotIndex = parseInt(req.params.slotIndex as string, 10);
      const { deviceName, deviceSerial } = req.body;

      const slot = await equipmentService.activateSlot({
        subscriptionId: subId,
        slotIndex,
        deviceName: (deviceName as string) || `Workstation-${slotIndex + 1}`,
        deviceSerial: (deviceSerial as string) || `SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
        tenantId: req.user!.tenantId,
      });

      res.json({
        success: true,
        data: slot,
      });
    } catch (error) {
      next(error);
    }
  }

  async deactivateSlot(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subId = req.params.subId as string;
      const slotIndex = parseInt(req.params.slotIndex as string, 10);
      const slot = await equipmentService.deactivateSlot(subId, slotIndex, req.user!.tenantId);
      res.json({
        success: true,
        data: slot,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await equipmentService.getActiveDevicesForClient(
        req.user!.userId,
        req.user!.tenantId
      );
      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const equipmentController = new EquipmentController();
