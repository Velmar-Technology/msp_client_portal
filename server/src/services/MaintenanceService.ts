import { maintenanceRepository, MaintenanceRepository } from '../repositories/MaintenanceRepository';
import { equipmentRepository, EquipmentRepository } from '../repositories/EquipmentRepository';
import { subscriptionRepository, SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { DeviceMaintenance, UserRole, MaintenanceStatus, MaintenanceType } from '../types';
import { CreateMaintenanceInput, UpdateMaintenanceInput, MaintenanceQueryInput } from '../dtos/maintenance.dto';
import { notificationService, NotificationService } from './NotificationService';

export class MaintenanceService {
  constructor(
    private maintenanceRepo: MaintenanceRepository = maintenanceRepository,
    private equipmentRepo: EquipmentRepository = equipmentRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private notifSvc: NotificationService = notificationService,
  ) {}
  async getMaintenances(
    tenantId: string,
    user: { id: string; role: UserRole },
    query: MaintenanceQueryInput
  ): Promise<DeviceMaintenance[]> {
    const filters: {
      startDate?: Date;
      endDate?: Date;
      clientId?: string;
      techId?: string;
      equipmentId?: string;
      status?: string;
    } = {};

    if (query.startDate) {
      filters.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.endDate = new Date(query.endDate);
    }
    if (query.status) {
      filters.status = query.status;
    }
    if (query.equipmentId) {
      filters.equipmentId = query.equipmentId;
    }

    // Role-based scoping
    if (user.role === UserRole.CLIENT) {
      filters.clientId = user.id;
    } else if (user.role === UserRole.TECHNICIAN) {
      if (query.techId) {
        filters.techId = query.techId;
      }
      if (query.clientId) {
        filters.clientId = query.clientId;
      }
    } else if (user.role === UserRole.ADMIN) {
      if (query.clientId) {
        filters.clientId = query.clientId;
      }
      if (query.techId) {
        filters.techId = query.techId;
      }
    }

    const effectiveTenantId = user.role === UserRole.CLIENT ? tenantId : undefined;
    const items = await this.maintenanceRepo.findByTenant(effectiveTenantId, filters);

    // Auto-mark overdue statuses if scheduled date has passed and status is still SCHEDULED
    const now = new Date();
    const processed = items.map((item) => {
      if (item.status === MaintenanceStatus.SCHEDULED && new Date(item.scheduled_date) < now) {
        return { ...item, status: MaintenanceStatus.OVERDUE };
      }
      return item;
    });

    return processed;
  }

  async getMaintenanceById(id: string, tenantId: string, user: { id: string; role: UserRole }): Promise<DeviceMaintenance> {
    const effectiveTenantId = user.role === UserRole.CLIENT ? tenantId : undefined;
    const item = await this.maintenanceRepo.findByIdWithDetails(id, effectiveTenantId);
    if (!item) {
      throw AppError.notFound('Maintenance schedule not found');
    }
    if (user.role === UserRole.CLIENT && item.client_id !== user.id) {
      throw AppError.forbidden('Access denied');
    }
    return item;
  }

  async scheduleMaintenance(
    tenantId: string,
    user: { id: string; role: UserRole },
    data: CreateMaintenanceInput
  ): Promise<DeviceMaintenance> {
    const equipment = await this.equipmentRepo.findById(data.equipmentId);
    if (!equipment) {
      throw AppError.notFound('Device / Equipment slot not found');
    }
    if (user.role === UserRole.CLIENT && equipment.tenant_id !== tenantId) {
      throw AppError.forbidden('Access denied');
    }

    const subscription = await this.subscriptionRepo.findById(equipment.subscription_id);
    if (!subscription) {
      throw AppError.notFound('Associated subscription not found');
    }

    // Permission check: Clients can only schedule maintenance for their own subscription devices
    if (user.role === UserRole.CLIENT && subscription.client_id !== user.id) {
      throw AppError.forbidden('Cannot schedule maintenance for another user device');
    }

    let scheduledDate: Date;
    let type = data.maintenanceType || MaintenanceType.PREDEFINED_6M;

    if (data.scheduledDate) {
      scheduledDate = new Date(data.scheduledDate);
      type = MaintenanceType.CUSTOM_DATE;
    } else {
      const months = data.monthsAhead ?? 6;
      scheduledDate = new Date();
      scheduledDate.setMonth(scheduledDate.getMonth() + months);
      if (months === 3) type = MaintenanceType.PREDEFINED_3M;
      else if (months === 6) type = MaintenanceType.PREDEFINED_6M;
      else if (months === 12) type = MaintenanceType.PREDEFINED_12M;
    }

    const deviceDisplayName = equipment.device_name || `Slot #${equipment.slot_index + 1}`;
    const defaultTitle = data.title || `Routine Device Maintenance - ${deviceDisplayName}`;
    const targetTenantId = user.role === UserRole.CLIENT ? tenantId : equipment.tenant_id;

    const newMaintenance = await this.maintenanceRepo.create({
      equipment_id: equipment.id,
      subscription_id: subscription.id,
      client_id: subscription.client_id,
      tenant_id: targetTenantId,
      assigned_tech_id: data.assignedTechId || null,
      scheduled_date: scheduledDate,
      status: MaintenanceStatus.SCHEDULED,
      title: defaultTitle,
      notes: data.notes || null,
      maintenance_type: type,
      created_by: user.id,
    });

    // Send in-app notification to client if scheduled by admin/tech
    if (user.role !== UserRole.CLIENT) {
      await this.notifSvc.createInAppNotification({
        userId: subscription.client_id,
        tenantId: targetTenantId,
        title: 'Device Maintenance Scheduled',
        message: `Maintenance scheduled for ${deviceDisplayName} on ${scheduledDate.toLocaleDateString()}`,
        type: 'SYSTEM',
      }).catch((err) => logger.error('Failed to send maintenance notification:', { err }));
    }

    return (await this.maintenanceRepo.findByIdWithDetails(newMaintenance.id, targetTenantId)) || newMaintenance;
  }

  async updateMaintenance(
    tenantId: string,
    user: { id: string; role: UserRole },
    id: string,
    data: UpdateMaintenanceInput
  ): Promise<DeviceMaintenance> {
    const effectiveTenantId = user.role === UserRole.CLIENT ? tenantId : undefined;
    const existing = await this.maintenanceRepo.findByIdWithDetails(id, effectiveTenantId);
    if (!existing) {
      throw AppError.notFound('Maintenance schedule not found');
    }

    if (user.role === UserRole.CLIENT) {
      throw AppError.forbidden('Only technicians or administrators can update maintenance schedules');
    }

    const updatePayload: Partial<DeviceMaintenance> = {};

    if (data.scheduledDate) {
      updatePayload.scheduled_date = new Date(data.scheduledDate);
      updatePayload.maintenance_type = MaintenanceType.CUSTOM_DATE;
    }
    if (data.status) {
      updatePayload.status = data.status;
    }
    if (data.assignedTechId !== undefined) {
      updatePayload.assigned_tech_id = data.assignedTechId;
    }
    if (data.title) {
      updatePayload.title = data.title;
    }
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }

    await this.maintenanceRepo.update(id, updatePayload);
    const updated = await this.maintenanceRepo.findByIdWithDetails(id, effectiveTenantId);

    // If status changed to COMPLETED, optionally notify client
    if (data.status === MaintenanceStatus.COMPLETED && existing.status !== MaintenanceStatus.COMPLETED) {
      await this.notifSvc.createInAppNotification({
        userId: existing.client_id,
        tenantId: existing.tenant_id,
        title: 'Device Maintenance Completed',
        message: `Maintenance for ${existing.device_name || 'Device'} has been marked as completed.`,
        type: 'SYSTEM',
      }).catch((err) => logger.error('Failed to send maintenance completed notification:', { err }));
    }

    return updated || existing;
  }

  async deleteMaintenance(tenantId: string, user: { id: string; role: UserRole }, id: string): Promise<{ success: boolean }> {
    if (user.role === UserRole.CLIENT) {
      throw AppError.forbidden('Only technicians or administrators can delete maintenance schedules');
    }

    const effectiveTenantId = (user.role as UserRole) === UserRole.CLIENT ? tenantId : undefined;
    const existing = await this.maintenanceRepo.findByIdWithDetails(id, effectiveTenantId);
    if (!existing) {
      throw AppError.notFound('Maintenance schedule not found');
    }

    const success = await this.maintenanceRepo.delete(id, effectiveTenantId);
    return { success };
  }
}

export const maintenanceService = new MaintenanceService();
