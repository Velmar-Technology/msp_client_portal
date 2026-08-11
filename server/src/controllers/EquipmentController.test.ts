import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { EquipmentController } from './EquipmentController';
import { UserRole } from '../types';

describe('EquipmentController', () => {
  let controller: EquipmentController;
  let mockEquipmentSvc: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    mockEquipmentSvc = {
      getEquipmentSlots: vi.fn(),
      generateSlotOTP: vi.fn(),
      activateSlot: vi.fn(),
      deactivateSlot: vi.fn(),
      getActiveDevicesForClient: vi.fn(),
      getAllDevicesForAdmin: vi.fn(),
      getNextcloudInfo: vi.fn(),
    };
    controller = new EquipmentController(mockEquipmentSvc);

    req = {
      params: {},
      body: {},
      user: {
        userId: 'user-123',
        role: UserRole.CLIENT,
        tenantId: 'tenant-123',
        email: 'test@example.com',
      },
    };
    res = {
      json: vi.fn(),
    };
    next = vi.fn();
  });

  describe('getSlots', () => {
    it('should return equipment slots for a subscription', async () => {
      req.params = { subId: 'sub-1' };
      const slots = [{ id: 'slot-1', slot_index: 0 }];
      mockEquipmentSvc.getEquipmentSlots.mockResolvedValue(slots);

      await controller.getSlots(req as Request, res as Response, next);

      expect(mockEquipmentSvc.getEquipmentSlots).toHaveBeenCalledWith('sub-1', 'tenant-123', false);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: slots });
    });
  });

  describe('generateOTP', () => {
    it('should reject if user role is CLIENT', async () => {
      req.user!.role = UserRole.CLIENT;
      await controller.generateOTP(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Client users are not authorized to generate activation codes' }));
    });

    it('should call generateSlotOTP for ADMIN users', async () => {
      req.user!.role = UserRole.ADMIN;
      req.params = { subId: 'sub-1', slotIndex: '0' };
      const slot = { id: 'slot-1', otp: '123456' };
      mockEquipmentSvc.generateSlotOTP.mockResolvedValue(slot);

      await controller.generateOTP(req as Request, res as Response, next);

      expect(mockEquipmentSvc.generateSlotOTP).toHaveBeenCalledWith('sub-1', 0, 'tenant-123', true);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: slot });
    });
  });

  describe('activateWithOtp', () => {
    it('should throw bad request error if OTP format is invalid', async () => {
      req.body = { otp: 'invalid' };
      await controller.activateWithOtp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Activation code (OTP) must be a 6-digit numeric code' }));
    });

    it('should activate slot when OTP is valid 6-digit string', async () => {
      req.body = { otp: '654321', deviceName: 'Laptop', deviceSerial: 'SN-999' };
      const slot = { id: 'slot-1', status: 'ACTIVE' };
      mockEquipmentSvc.activateSlot.mockResolvedValue(slot);

      await controller.activateWithOtp(req as Request, res as Response, next);

      expect(mockEquipmentSvc.activateSlot).toHaveBeenCalledWith({
        otp: '654321',
        deviceName: 'Laptop',
        deviceSerial: 'SN-999',
        tenantId: 'tenant-123',
        byAdmin: false,
      });
      expect(res.json).toHaveBeenCalledWith({ success: true, data: slot });
    });
  });

  describe('getMyDevices', () => {
    it('should fetch active devices for current client', async () => {
      const devices = [{ id: 'dev-1', device_name: 'Workstation 1' }];
      mockEquipmentSvc.getActiveDevicesForClient.mockResolvedValue(devices);

      await controller.getMyDevices(req as Request, res as Response, next);

      expect(mockEquipmentSvc.getActiveDevicesForClient).toHaveBeenCalledWith('user-123', 'tenant-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: devices });
    });
  });

  describe('getAllDevicesForAdmin', () => {
    it('should fetch all devices for admin view', async () => {
      const devices = [{ id: 'dev-1', client_name: 'Client A' }];
      mockEquipmentSvc.getAllDevicesForAdmin.mockResolvedValue(devices);

      await controller.getAllDevicesForAdmin(req as Request, res as Response, next);

      expect(mockEquipmentSvc.getAllDevicesForAdmin).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: devices });
    });
  });
});
