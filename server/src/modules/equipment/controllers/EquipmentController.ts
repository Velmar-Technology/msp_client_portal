import { Request, Response } from 'express';
import { equipmentService, EquipmentService } from '@modules/equipment/services/EquipmentService';
import { ForbiddenError, ValidationError } from '@shared/errors';

export class EquipmentController {
  constructor(private equipmentSvc: EquipmentService = equipmentService) {}

  async getSlots(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const byAdmin = req.user!.role === 'ADMIN';
    const slots = await this.equipmentSvc.getEquipmentSlots(subId, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slots,
    });
  }

  async generateOTP(req: Request, res: Response): Promise<void> {
    if (req.user!.role === 'CLIENT') {
      throw new ForbiddenError('Client users are not authorized to generate activation codes');
    }
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN' || req.user!.role === 'TECHNICIAN';
    const slot = await this.equipmentSvc.generateSlotOTP(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slot,
    });
  }

  async activateSlot(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const { deviceName, deviceSerial } = req.body;
    const byAdmin = req.user!.role === 'ADMIN';

    const slot = await this.equipmentSvc.activateSlot({
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
  }

  async activateWithOtp(req: Request, res: Response): Promise<void> {
    const { otp, deviceName, deviceSerial } = req.body;

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      throw new ValidationError('Activation code (OTP) must be a 6-digit numeric code');
    }

    const slot = await this.equipmentSvc.activateSlot({
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
  }

  async deactivateSlot(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const slot = await this.equipmentSvc.deactivateSlot(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: slot,
    });
  }

  async getMyDevices(req: Request, res: Response): Promise<void> {
    const isClient = req.user!.role === 'CLIENT';
    const devices = isClient
      ? await this.equipmentSvc.getActiveDevicesForClient(req.user!.userId, req.user!.tenantId)
      : await this.equipmentSvc.getAllDevicesForAdmin();
    res.json({
      success: true,
      data: devices,
    });
  }

  async getAllDevicesForAdmin(_req: Request, res: Response): Promise<void> {
    const devices = await this.equipmentSvc.getAllDevicesForAdmin();
    res.json({
      success: true,
      data: devices,
    });
  }

  async addAdminDevice(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can register devices directly');
    }
    const { deviceName, deviceSerial, tenantId } = req.body;
    const targetTenantId = (tenantId as string) || req.user!.tenantId;

    const device = await this.equipmentSvc.addAdminDevice({
      deviceName: deviceName as string,
      deviceSerial: deviceSerial as string,
      tenantId: targetTenantId,
      adminUserId: req.user!.userId,
    });

    res.status(201).json({
      success: true,
      data: device,
    });
  }

  async deleteAdminDevice(req: Request, res: Response): Promise<void> {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can delete equipment');
    }
    const { id } = req.params;
    const result = await this.equipmentSvc.deleteAdminEquipment(id as string, req.user!.userId);
    res.json({
      success: true,
      data: result,
    });
  }

  async getSlotNextcloudInfo(req: Request, res: Response): Promise<void> {
    const subId = req.params.subId as string;
    const slotIndex = parseInt(req.params.slotIndex as string, 10);
    const byAdmin = req.user!.role === 'ADMIN';
    const info = await this.equipmentSvc.getNextcloudInfo(subId, slotIndex, req.user!.tenantId, byAdmin);
    res.json({
      success: true,
      data: info,
    });
  }
}

export const equipmentController = new EquipmentController();
