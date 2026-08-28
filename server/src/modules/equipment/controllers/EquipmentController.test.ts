import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EquipmentController } from './EquipmentController';
import { UserRole } from '@shared/types';

describe('EquipmentController', () => {
  let controller: EquipmentController;
  let mockEquipmentSvc: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    mockEquipmentSvc = {
      getEquipmentSlots: vi.fn(),
      bindAndActivateSlot: vi.fn(),
      deactivateSlot: vi.fn(),
      unbindSlotForRepair: vi.fn(),
      getActiveDevicesForClient: vi.fn(),
      getAllDevicesForAdmin: vi.fn(),
      getNextcloudInfo: vi.fn(),
      getAgentIdentityByOtp: vi.fn(),
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
  });

  describe('getSlots', () => {
    it('should return equipment slots for a subscription', async () => {
      req.params = { subId: 'sub-1' };
      const slots = [{ id: 'slot-1', slot_index: 0 }];
      mockEquipmentSvc.getEquipmentSlots.mockResolvedValue(slots);

      await controller.getSlots(req, res);

      expect(mockEquipmentSvc.getEquipmentSlots).toHaveBeenCalledWith('sub-1', 'tenant-123', false);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: slots });
    });
  });

  describe('activateWithOtp', () => {
    it('should throw bad request error if OTP format is invalid', async () => {
      req.body = { otp: 'invalid', subscriptionId: 'sub-1', slotIndex: 0 };
      await expect(
        controller.activateWithOtp(req, res)
      ).rejects.toThrow('Activation code (OTP) must be a 6-digit numeric code');
    });

    it('should throw if subscriptionId is missing', async () => {
      req.body = { otp: '654321', slotIndex: 0 };
      await expect(
        controller.activateWithOtp(req, res)
      ).rejects.toThrow('subscriptionId is required');
    });

    it('should throw if slotIndex is invalid', async () => {
      req.body = { otp: '654321', subscriptionId: 'sub-1', slotIndex: -1 };
      await expect(
        controller.activateWithOtp(req, res)
      ).rejects.toThrow('slotIndex must be a non-negative integer');
    });

    it('should bind and activate the slot when the payload is valid', async () => {
      req.body = { otp: '654321', subscriptionId: 'sub-1', slotIndex: 2, deviceName: 'Laptop', deviceSerial: 'SN-999' };
      const slot = { id: 'slot-1', status: 'ACTIVE' };
      mockEquipmentSvc.bindAndActivateSlot.mockResolvedValue(slot);

      await controller.activateWithOtp(req, res);

      expect(mockEquipmentSvc.bindAndActivateSlot).toHaveBeenCalledWith({
        code: '654321',
        subscriptionId: 'sub-1',
        slotIndex: 2,
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

      await controller.getMyDevices(req, res);

      expect(mockEquipmentSvc.getActiveDevicesForClient).toHaveBeenCalledWith('user-123', 'tenant-123');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: devices });
    });
  });

  describe('getAllDevicesForAdmin', () => {
    it('should fetch all devices for admin view', async () => {
      const devices = [{ id: 'dev-1', client_name: 'Client A' }];
      mockEquipmentSvc.getAllDevicesForAdmin.mockResolvedValue(devices);

      await controller.getAllDevicesForAdmin(req, res);

      expect(mockEquipmentSvc.getAllDevicesForAdmin).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: devices });
    });
  });

  describe('repairSlot', () => {
    it('should unbind the slot for re-pairing on behalf of the client owner', async () => {
      req.params = { subId: 'sub-1', slotIndex: '0' };
      const slot = { id: 'slot-1', status: 'PENDING_ACTIVATION', nextcloud_username: 'client_tenant_slot_1' };
      mockEquipmentSvc.unbindSlotForRepair.mockResolvedValue(slot);

      await controller.repairSlot(req, res);

      expect(mockEquipmentSvc.unbindSlotForRepair).toHaveBeenCalledWith('sub-1', 0, 'tenant-123', false);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: slot });
    });

    it('should pass admin bypass flag for ADMIN users', async () => {
      req.user!.role = UserRole.ADMIN;
      req.params = { subId: 'sub-1', slotIndex: '2' };
      mockEquipmentSvc.unbindSlotForRepair.mockResolvedValue({ id: 'slot-1', status: 'PENDING_ACTIVATION' });

      await controller.repairSlot(req, res);

      expect(mockEquipmentSvc.unbindSlotForRepair).toHaveBeenCalledWith('sub-1', 2, 'tenant-123', true);
    });
  });

  describe('getAgentIdentity', () => {
    it('should throw validation error for a non-6-digit OTP', async () => {
      req.query = { otp: '12ab' };
      await expect(
        controller.getAgentIdentity(req, res)
      ).rejects.toThrow('Activation code (OTP) must be a 6-digit numeric code');
      expect(mockEquipmentSvc.getAgentIdentityByOtp).not.toHaveBeenCalled();
    });

    it('should return detected identity for a client OTP lookup', async () => {
      req.query = { otp: '123456' };
      mockEquipmentSvc.getAgentIdentityByOtp.mockResolvedValue({
        hostname: 'SRV-01',
        serial: 'CN-XYZ',
        lastSeenAt: new Date().toISOString(),
      });

      await controller.getAgentIdentity(req, res);

      expect(mockEquipmentSvc.getAgentIdentityByOtp).toHaveBeenCalledWith('123456', 'tenant-123', false);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { hostname: 'SRV-01', serial: 'CN-XYZ', lastSeenAt: expect.any(String) },
      });
    });

    it('should pass admin bypass flag for ADMIN users', async () => {
      req.user!.role = UserRole.ADMIN;
      req.query = { otp: '654321' };
      mockEquipmentSvc.getAgentIdentityByOtp.mockResolvedValue({
        hostname: 'SRV-02',
        serial: 'SN-02',
        lastSeenAt: null,
      });

      await controller.getAgentIdentity(req, res);

      expect(mockEquipmentSvc.getAgentIdentityByOtp).toHaveBeenCalledWith('654321', 'tenant-123', true);
    });
  });
});
