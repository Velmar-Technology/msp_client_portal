import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findByTenant: vi.fn(),
    findByIdWithDetails: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findEquipmentById: vi.fn(),
    findSubscriptionById: vi.fn(),
  };
});

vi.mock('../repositories/MaintenanceRepository', () => {
  return {
    maintenanceRepository: {
      findByTenant: mocks.findByTenant,
      findByIdWithDetails: mocks.findByIdWithDetails,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  };
});

vi.mock('../repositories/EquipmentRepository', () => {
  return {
    equipmentRepository: {
      findById: mocks.findEquipmentById,
    },
  };
});

vi.mock('../repositories/SubscriptionRepository', () => {
  return {
    subscriptionRepository: {
      findById: mocks.findSubscriptionById,
    },
  };
});

vi.mock('./NotificationService', () => {
  return {
    notificationService: {
      createInAppNotification: vi.fn().mockResolvedValue(true),
    },
  };
});

import { maintenanceService } from './MaintenanceService';
import { UserRole, MaintenanceStatus, MaintenanceType } from '../types';

describe('MaintenanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockItem = {
    id: 'maint-1',
    equipment_id: 'equip-1',
    subscription_id: 'sub-1',
    client_id: 'client-1',
    tenant_id: 'tenant-1',
    assigned_tech_id: 'tech-1',
    scheduled_date: new Date(Date.now() + 86400000 * 30),
    status: MaintenanceStatus.SCHEDULED,
    title: 'Routine Device Maintenance - Workstation 1',
    notes: 'Check hardware health',
    maintenance_type: MaintenanceType.PREDEFINED_6M,
    created_by: 'admin-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockEquipment = {
    id: 'equip-1',
    subscription_id: 'sub-1',
    slot_index: 0,
    status: 'ACTIVE',
    device_name: 'Workstation 1',
    tenant_id: 'tenant-1',
  };

  const mockSubscription = {
    id: 'sub-1',
    client_id: 'client-1',
    service_name: 'Premium Support Plan',
    tenant_id: 'tenant-1',
  };

  describe('getMaintenances', () => {
    it('should return list of maintenances for tenant', async () => {
      mocks.findByTenant.mockResolvedValue([mockItem]);

      const result = await maintenanceService.getMaintenances(
        'tenant-1',
        { id: 'admin-1', role: UserRole.ADMIN },
        {}
      );

      expect(mocks.findByTenant).toHaveBeenCalledWith(undefined, expect.anything());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('maint-1');
    });

    it('should enforce client isolation by setting clientId filter for Client role', async () => {
      mocks.findByTenant.mockResolvedValue([mockItem]);

      await maintenanceService.getMaintenances(
        'tenant-1',
        { id: 'client-1', role: UserRole.CLIENT },
        {}
      );

      expect(mocks.findByTenant).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ clientId: 'client-1' }));
    });
  });

  describe('scheduleMaintenance', () => {
    it('should schedule maintenance defaulting to 6 months if no custom date provided', async () => {
      mocks.findEquipmentById.mockResolvedValue(mockEquipment);
      mocks.findSubscriptionById.mockResolvedValue(mockSubscription);
      mocks.create.mockResolvedValue(mockItem);
      mocks.findByIdWithDetails.mockResolvedValue(mockItem);

      const result = await maintenanceService.scheduleMaintenance(
        'tenant-1',
        { id: 'admin-1', role: UserRole.ADMIN },
        {
          equipmentId: 'equip-1',
          monthsAhead: 6,
        }
      );

      expect(mocks.findEquipmentById).toHaveBeenCalledWith('equip-1');
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          equipment_id: 'equip-1',
          maintenance_type: MaintenanceType.PREDEFINED_6M,
          status: MaintenanceStatus.SCHEDULED,
        })
      );
      expect(result.id).toBe('maint-1');
    });

    it('should schedule maintenance using custom date picker when provided', async () => {
      mocks.findEquipmentById.mockResolvedValue(mockEquipment);
      mocks.findSubscriptionById.mockResolvedValue(mockSubscription);
      const customDateStr = new Date('2026-11-15T10:00:00.000Z').toISOString();
      mocks.create.mockResolvedValue({ ...mockItem, scheduled_date: new Date(customDateStr), maintenance_type: MaintenanceType.CUSTOM_DATE });
      mocks.findByIdWithDetails.mockResolvedValue({ ...mockItem, scheduled_date: new Date(customDateStr), maintenance_type: MaintenanceType.CUSTOM_DATE });

      const result = await maintenanceService.scheduleMaintenance(
        'tenant-1',
        { id: 'admin-1', role: UserRole.ADMIN },
        {
          equipmentId: 'equip-1',
          scheduledDate: customDateStr,
        }
      );

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          maintenance_type: MaintenanceType.CUSTOM_DATE,
        })
      );
      expect(result.maintenance_type).toBe(MaintenanceType.CUSTOM_DATE);
    });

    it('should allow ADMIN to schedule maintenance for equipment belonging to another tenant', async () => {
      mocks.findEquipmentById.mockResolvedValue({ ...mockEquipment, tenant_id: 'client-tenant-99' });
      mocks.findSubscriptionById.mockResolvedValue({ ...mockSubscription, tenant_id: 'client-tenant-99' });
      mocks.create.mockResolvedValue({ ...mockItem, tenant_id: 'client-tenant-99' });
      mocks.findByIdWithDetails.mockResolvedValue({ ...mockItem, tenant_id: 'client-tenant-99' });

      const result = await maintenanceService.scheduleMaintenance(
        'admin-tenant-1',
        { id: 'admin-1', role: UserRole.ADMIN },
        { equipmentId: 'equip-1', monthsAhead: 6 }
      );

      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'client-tenant-99',
        })
      );
      expect(result).toBeDefined();
    });
  });

  describe('updateMaintenance', () => {
    it('should update status and notes for Tech/Admin', async () => {
      mocks.findByIdWithDetails.mockResolvedValue(mockItem);
      mocks.update.mockResolvedValue({ ...mockItem, status: MaintenanceStatus.COMPLETED });

      const result = await maintenanceService.updateMaintenance(
        'tenant-1',
        { id: 'tech-1', role: UserRole.TECHNICIAN },
        'maint-1',
        { status: MaintenanceStatus.COMPLETED, notes: 'Completed software updates' }
      );

      expect(mocks.update).toHaveBeenCalledWith('maint-1', expect.objectContaining({ status: MaintenanceStatus.COMPLETED }));
      expect(result).toBeDefined();
    });

    it('should throw forbidden if Client attempts to update maintenance', async () => {
      mocks.findByIdWithDetails.mockResolvedValue(mockItem);

      await expect(
        maintenanceService.updateMaintenance(
          'tenant-1',
          { id: 'client-1', role: UserRole.CLIENT },
          'maint-1',
          { status: MaintenanceStatus.COMPLETED }
        )
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });
});
