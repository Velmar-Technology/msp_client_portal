import { Request, Response, NextFunction } from 'express';
import { equipmentService } from '../services/EquipmentService';
import { AppError } from '../utils/AppError';

export class EquipmentController {
  async getSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subId = req.params.subId as string;
      const byAdmin = req.user!.role === 'ADMIN';
      const slots = await equipmentService.getEquipmentSlots(subId, req.user!.tenantId, byAdmin);
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
      if (req.user!.role === 'CLIENT') {
        throw AppError.forbidden('Client users are not authorized to generate activation codes');
      }
      const subId = req.params.subId as string;
      const slotIndex = parseInt(req.params.slotIndex as string, 10);
      const byAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'TECHNICIAN';
      const slot = await equipmentService.generateSlotOTP(subId, slotIndex, req.user!.tenantId, byAdmin);
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
      const byAdmin = req.user!.role === 'ADMIN';

      const slot = await equipmentService.activateSlot({
        subscriptionId: subId,
        slotIndex,
        deviceName: (deviceName as string) || `Workstation-${slotIndex + 1}`,
        deviceSerial: (deviceSerial as string) || `SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
        tenantId: req.user!.tenantId,
        byAdmin,
      });

      res.json({
        success: true,
        data: slot,
      });
    } catch (error) {
      next(error);
    }
  }

  async activateWithOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { otp, deviceName, deviceSerial } = req.body;

      if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
        throw AppError.badRequest('Activation code (OTP) must be a 6-digit numeric code');
      }

      const slot = await equipmentService.activateSlot({
        otp,
        deviceName: (deviceName as string) || `Workstation-${Math.floor(100000 + Math.random() * 900000)}`,
        deviceSerial: (deviceSerial as string) || `SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`,
        tenantId: req.user!.tenantId,
        byAdmin: req.user!.role !== 'CLIENT',
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
      const byAdmin = req.user!.role === 'ADMIN';
      const slot = await equipmentService.deactivateSlot(subId, slotIndex, req.user!.tenantId, byAdmin);
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

  async getAllDevicesForAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await equipmentService.getAllDevicesForAdmin();
      res.json({
        success: true,
        data: devices,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSlotNextcloudInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subId = req.params.subId as string;
      const slotIndex = parseInt(req.params.slotIndex as string, 10);
      const byAdmin = req.user!.role === 'ADMIN';
      const info = await equipmentService.getNextcloudInfo(subId, slotIndex, req.user!.tenantId, byAdmin);
      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const equipmentController = new EquipmentController();
