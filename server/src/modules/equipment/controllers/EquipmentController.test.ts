import fs from 'fs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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
      get: vi.fn().mockImplementation((header: string) => {
        if (header.toLowerCase() === 'host') return 'localhost:3001';
        return null;
      }),
      user: {
        userId: 'user-123',
        role: UserRole.CLIENT,
        tenantId: 'tenant-123',
        email: 'test@example.com',
      },
    };
    res = {
      json: vi.fn(),
      setHeader: vi.fn(),
      send: vi.fn(),
      download: vi.fn(),
      status: vi.fn().mockReturnThis(),
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

  describe('getDeployToken', () => {
    it('should throw ForbiddenError if user has unauthorized role', async () => {
      req.user!.role = UserRole.TECHNICIAN;
      req.params = { subId: 'sub-1', slotIndex: '0' };

      await expect(controller.getDeployToken(req, res)).rejects.toThrow(
        'Only administrators and clients can generate deployment tokens'
      );
    });

    it('should generate a 5-minute scoped deployment token for ADMIN', async () => {
      req.user!.role = UserRole.ADMIN;
      req.params = { subId: 'sub-1', slotIndex: '0' };
      mockEquipmentSvc.getNextcloudInfo.mockResolvedValue({
        nextcloud_username: 'u1',
        nextcloud_password: 'p1',
      });

      await controller.getDeployToken(req, res);

      expect(mockEquipmentSvc.getNextcloudInfo).toHaveBeenCalledWith('sub-1', 0, 'tenant-123', true);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: expect.any(String),
          expiresIn: 300,
          subscriptionId: 'sub-1',
          slotIndex: 0,
        }),
      });
    });

    it('should generate a 5-minute scoped deployment token for CLIENT within tenant', async () => {
      req.user!.role = UserRole.CLIENT;
      req.params = { subId: 'sub-1', slotIndex: '0' };
      mockEquipmentSvc.getNextcloudInfo.mockResolvedValue({
        nextcloud_username: 'u1',
        nextcloud_password: 'p1',
      });

      await controller.getDeployToken(req, res);

      expect(mockEquipmentSvc.getNextcloudInfo).toHaveBeenCalledWith('sub-1', 0, 'tenant-123', false);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: expect.any(String),
          expiresIn: 300,
          subscriptionId: 'sub-1',
          slotIndex: 0,
        }),
      });
    });
  });

  describe('getDeployScript', () => {
    it('should throw ForbiddenError if user has unauthorized role', async () => {
      req.user!.role = UserRole.TECHNICIAN;
      req.params = { subId: 'sub-1', slotIndex: '0' };

      await expect(controller.getDeployScript(req, res)).rejects.toThrow(
        'Only administrators and clients can generate deployment scripts'
      );
    });

    it('should generate deployment script for CLIENT with provisioned credentials', async () => {
      req.user!.role = UserRole.CLIENT;
      req.params = { subId: 'sub-1', slotIndex: '0' };
      mockEquipmentSvc.getNextcloudInfo.mockResolvedValue({
        nextcloud_username: 'client_user',
        nextcloud_password: 'client_password',
      });
      res.setHeader = vi.fn();
      res.send = vi.fn();

      await controller.getDeployScript(req, res);

      expect(mockEquipmentSvc.getNextcloudInfo).toHaveBeenCalledWith('sub-1', 0, 'tenant-123', false);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('client_user'));
    });
  });

  describe('getAgentDeployScript', () => {
    it('should throw ForbiddenError if user has unauthorized role', async () => {
      req.user!.role = UserRole.TECHNICIAN;
      req.params = { subId: 'sub-1', slotIndex: '0' };

      await expect(controller.getAgentDeployScript(req, res)).rejects.toThrow(
        'Only administrators and clients can generate deployment scripts'
      );
    });

    it('should generate PowerShell agent deploy script for CLIENT', async () => {
      req.user!.role = UserRole.CLIENT;
      req.params = { subId: 'sub-1', slotIndex: '0' };
      mockEquipmentSvc.getEquipmentSlots.mockResolvedValue([
        { slot_index: 0, otp: '123456' },
      ]);
      res.setHeader = vi.fn();
      res.send = vi.fn();

      await controller.getAgentDeployScript(req, res);

      expect(mockEquipmentSvc.getEquipmentSlots).toHaveBeenCalledWith('sub-1', 'tenant-123', false);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="deploy-msp-agent.ps1"');
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('MSP ENDPOINT AGENT SEAMLESS INSTALLER'));
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining('123456'));
    });
  });

  describe('downloadAgentBinary', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return 404 if binary file is not found on disk', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      await controller.downloadAgentBinary(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
      }));
    });

    it('should download binary if file is found on disk', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      await controller.downloadAgentBinary(req, res);

      expect(res.download).toHaveBeenCalledWith(expect.any(String), 'msp-agent.exe');
    });
  });
});
