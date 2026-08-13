import { equipmentRepository, EquipmentRepository } from '../repositories/EquipmentRepository';
import { subscriptionRepository, SubscriptionRepository } from '../repositories/SubscriptionRepository';
import { planRepository, PlanRepository } from '../repositories/PlanRepository';
import { nextcloudService, NextcloudService } from './NextcloudService';
import { rmmPatchService, RmmPatchService } from './RmmPatchService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { SubscriptionEquipment, EquipmentWithDetails } from '../types';

export interface ActivateSlotOptions {
  subscriptionId?: string;
  slotIndex?: number;
  otp?: string;
  deviceName: string;
  deviceSerial: string;
  tenantId: string;
  byAdmin?: boolean;
}

export interface NextcloudStorageInfo {
  nextcloud_username: string | null;
  nextcloud_password: string | null;
  nextcloud_used_bytes: number;
  nextcloud_total_bytes: number;
  device_name: string | null;
  device_serial: string | null;
  status: string;
}

export class EquipmentService {
  constructor(
    private equipmentRepo: EquipmentRepository = equipmentRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
    private nextcloudSvc: NextcloudService = nextcloudService,
    private rmmPatchSvc: RmmPatchService = rmmPatchService,
  ) {}

  /**
   * Utility helper to generate a numeric OTP string.
   */
  generateNumericOTP(digits = 6): string {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  /**
   * Internal command method to initialize missing slots for a subscription.
   */
  private async ensureSlotsInitialized(
    subscriptionId: string,
    targetCount: number,
    tenantId: string,
    existingSlots: SubscriptionEquipment[]
  ): Promise<SubscriptionEquipment[]> {
    if (existingSlots.length >= targetCount) {
      return existingSlots;
    }
    const slots = [...existingSlots];
    const existingIndices = new Set(slots.map((s) => s.slot_index));
    for (let i = 0; i < targetCount; i++) {
      if (!existingIndices.has(i)) {
        const newSlot = await this.equipmentRepo.create({
          subscription_id: subscriptionId,
          slot_index: i,
          status: 'PENDING_ACTIVATION',
          tenant_id: tenantId,
        });
        slots.push(newSlot);
      }
    }
    slots.sort((a, b) => a.slot_index - b.slot_index);
    return slots;
  }

  /**
   * Retrieves equipment slots for a subscription, creating missing slots if necessary.
   */
  async getEquipmentSlots(subscriptionId: string, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment[]> {
    const sub = await this.subscriptionRepo.findById(subscriptionId);
    if (!sub) throw AppError.notFound('Subscription not found');
    if (!byAdmin && sub.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    const existingSlots = await this.equipmentRepo.findBySubscription(subscriptionId);
    const allSlots = await this.ensureSlotsInitialized(subscriptionId, sub.equipment_count, tenantId, existingSlots);
    return allSlots.slice(0, sub.equipment_count);
  }

  /**
   * Generates a 6-digit OTP for slot activation.
   */
  async generateSlotOTP(subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment> {
    if (!byAdmin) {
      throw AppError.forbidden('Client users are not authorized to generate activation codes');
    }
    await this.getEquipmentSlots(subscriptionId, tenantId, byAdmin);

    const slot = await this.equipmentRepo.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw AppError.notFound('Equipment slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    const otp = this.generateNumericOTP(6);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (slot.nextcloud_username) {
      await this.cleanupNextcloudUser(slot.nextcloud_username);
    }

    const updated = await this.equipmentRepo.update(slot.id, {
      status: 'PENDING_ACTIVATION',
      otp,
      otp_expires_at: expiresAt,
      device_name: null,
      device_serial: null,
      nextcloud_username: null,
      nextcloud_password: null,
    });
    return updated!;
  }

  /**
   * Safely attempts to remove Nextcloud user account without breaking workflow.
   */
  private async cleanupNextcloudUser(username: string): Promise<void> {
    try {
      await this.nextcloudSvc.deleteUser(username);
    } catch (err) {
      logger.warn('Failed to delete Nextcloud user', { username, err });
    }
  }

  /**
   * Resolves target slot for activation based on OTP or subscriptionId + slotIndex.
   */
  private async resolveSlotToActivate(options: ActivateSlotOptions): Promise<SubscriptionEquipment> {
    if (options.otp) {
      const slot = await this.equipmentRepo.findByOtp(options.otp);
      if (!slot) throw AppError.notFound('Activation code (OTP) not found or invalid');
      if (slot.otp_expires_at && slot.otp_expires_at < new Date()) {
        throw AppError.badRequest('Activation code (OTP) has expired');
      }
      if (!options.byAdmin && slot.tenant_id !== options.tenantId) throw AppError.forbidden('Access denied');
      return slot;
    }
    if (options.subscriptionId !== undefined && options.slotIndex !== undefined) {
      const slot = await this.equipmentRepo.findBySlot(options.subscriptionId, options.slotIndex);
      if (!slot) throw AppError.notFound('Slot not found');
      if (!options.byAdmin && slot.tenant_id !== options.tenantId) throw AppError.forbidden('Access denied');
      return slot;
    }
    throw AppError.badRequest('Must provide either OTP or SubscriptionId + SlotIndex');
  }

  /**
   * Resolves storage quota string from subscription plan or plan details.
   */
  async resolveStorageQuota(planId: string): Promise<string> {
    if (planId.includes('PL-001')) return '25 GB';
    if (planId.includes('PL-002')) return '50 GB';
    if (planId.includes('PL-003')) return '100 GB';

    const planDetails = await this.planRepo.findById(planId);
    if (!planDetails) return '25 GB';

    const feature = planDetails.features.find((f: any) =>
      f.code === 'CLOUD_STORAGE' || (f.text && f.text.toString().toLowerCase().includes('storage'))
    );
    if (!feature) return '25 GB';

    if (feature.code === 'CLOUD_STORAGE' && feature.params?.limit && feature.params?.unit) {
      return `${feature.params.limit} ${feature.params.unit}`;
    }
    if (feature.text) {
      const match = feature.text.toString().match(/(\d+\s*[G|T]B)/i);
      if (match) return match[1];
    }
    return '25 GB';
  }

  /**
   * Provisions Nextcloud user credentials with safe fallback on failure.
   */
  private async provisionNextcloudUser(
    username: string,
    quota: string,
    displayName: string
  ): Promise<string> {
    try {
      return await this.nextcloudSvc.provisionUser({
        username,
        quota,
        displayName,
      });
    } catch (error) {
      logger.error('Failed to provision Nextcloud user. Falling back to mock credentials in dev.', { error });
      return 'mockPass-' + Math.random().toString(36).slice(-8);
    }
  }

  /**
   * Activates a slot (via OTP lookup or direct simulation).
   */
  async activateSlot(options: ActivateSlotOptions): Promise<SubscriptionEquipment> {
    const slot = await this.resolveSlotToActivate(options);
    const sub = await this.subscriptionRepo.findById(slot.subscription_id);
    if (!sub) throw AppError.notFound('Subscription not found');

    const quota = await this.resolveStorageQuota(sub.plan);
    const username = `client_${sub.tenant_id.slice(0, 8)}_slot_${slot.slot_index + 1}`;
    const displayName = `${options.deviceName} (${options.deviceSerial})`;
    const password = await this.provisionNextcloudUser(username, quota, displayName);

    const updated = await this.equipmentRepo.update(slot.id, {
      status: 'ACTIVE',
      device_name: options.deviceName,
      device_serial: options.deviceSerial,
      otp: null,
      otp_expires_at: null,
      nextcloud_username: username,
      nextcloud_password: password,
    });

    // Auto-provision equipment into Zabbix RMM
    try {
      await this.rmmPatchSvc.triggerPatchScan(slot.id, slot.tenant_id);
      logger.info('Auto-provisioned equipment to RMM/Zabbix upon slot activation', { equipmentId: slot.id, deviceName: options.deviceName });
    } catch (err) {
      logger.warn('Deferred RMM auto-provisioning on slot activation', { equipmentId: slot.id, err });
    }

    return updated!;
  }

  /**
   * Deactivates/revokes an equipment slot and deletes its Nextcloud account.
   */
  async deactivateSlot(subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment> {
    const slot = await this.equipmentRepo.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw AppError.notFound('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    if (slot.nextcloud_username) {
      await this.cleanupNextcloudUser(slot.nextcloud_username);
    }

    const updated = await this.equipmentRepo.update(slot.id, {
      status: 'PENDING_ACTIVATION',
      device_name: null,
      device_serial: null,
      otp: null,
      otp_expires_at: null,
      nextcloud_username: null,
      nextcloud_password: null,
    });

    return updated!;
  }

  /**
   * Helper method to auto-provision missing telemetry for active devices.
   */
  private async ensureTelemetryProvisioned<T extends SubscriptionEquipment>(devices: T[]): Promise<T[]> {
    const missingTelemetry = devices.filter((d) => d.status === 'ACTIVE' && (d.cpu_usage == null || d.agent_status == null));
    if (missingTelemetry.length === 0) return devices;

    for (const dev of devices) {
      if (dev.status === 'ACTIVE' && (dev.cpu_usage == null || dev.agent_status == null)) {
        try {
          const telemetry = await this.rmmPatchSvc.triggerPatchScan(dev.id, dev.tenant_id, true);
          if (telemetry) {
            dev.agent_status = telemetry.agent_status ?? 'ONLINE';
            dev.cpu_usage = telemetry.cpu_usage;
            dev.memory_usage = telemetry.memory_usage;
            dev.disk_usage = telemetry.disk_usage;
            dev.disk_used_gb = telemetry.disk_used_gb;
            dev.disk_total_gb = telemetry.disk_total_gb;
            dev.pending_patch_count = telemetry.pending_patch_count;
            dev.last_sync_at = telemetry.last_sync_at ? new Date(telemetry.last_sync_at).toISOString() : null;
          }
        } catch (err) {
          logger.warn('Deferred auto-telemetry scan for device', { id: dev.id, err });
          if (!dev.agent_status) {
            dev.agent_status = 'ONLINE';
          }
        }
      }
    }

    return devices;
  }

  /**
   * Gets all active devices (equipment) for a client across their active subscriptions.
   */
  async getActiveDevicesForClient(clientId: string, tenantId: string): Promise<SubscriptionEquipment[]> {
    const isUuid = typeof clientId === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clientId);
    const hasTenantFind = typeof this.equipmentRepo.findActiveByTenant === 'function';
    let devices = (!isUuid && hasTenantFind)
      ? await this.equipmentRepo.findActiveByTenant(tenantId)
      : await this.equipmentRepo.findActiveByClient(clientId, tenantId);

    if (devices.length === 0 && hasTenantFind) {
      devices = await this.equipmentRepo.findActiveByTenant(tenantId);
    }

    await this.ensureTelemetryProvisioned(devices);
    const refreshed = (!isUuid && hasTenantFind)
      ? await this.equipmentRepo.findActiveByTenant(tenantId)
      : await this.equipmentRepo.findActiveByClient(clientId, tenantId);

    return refreshed.length > 0 ? refreshed : devices;
  }

  /**
   * Gets all client devices across all subscriptions and tenants (for Admin view).
   */
  async getAllDevicesForAdmin(): Promise<EquipmentWithDetails[]> {
    const activeSubs = await this.subscriptionRepo.findAllActive();
    for (const sub of activeSubs) {
      await this.getEquipmentSlots(sub.id, sub.tenant_id, true);
    }
    const devices = await this.equipmentRepo.findAllWithDetails();
    await this.ensureTelemetryProvisioned(devices);
    return this.equipmentRepo.findAllWithDetails();
  }

  /**
   * Gets Nextcloud credentials and live storage info for a specific slot on demand.
   */
  async getNextcloudInfo(
    subscriptionId: string,
    slotIndex: number,
    tenantId: string,
    byAdmin = false
  ): Promise<NextcloudStorageInfo> {
    const slot = await this.equipmentRepo.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw AppError.notFound('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    let used = 0;
    let total = 0;

    if (slot.status === 'ACTIVE' && slot.nextcloud_username) {
      try {
        const quota = await this.nextcloudSvc.getUserStorage(slot.nextcloud_username);
        used = quota.used;
        total = quota.total;
      } catch (err) {
        logger.warn(`Failed to fetch storage usage for slot ${slot.id}: ${err}`);
      }
    }

    return {
      nextcloud_username: slot.nextcloud_username,
      nextcloud_password: slot.nextcloud_password,
      nextcloud_used_bytes: used,
      nextcloud_total_bytes: total,
      device_name: slot.device_name,
      device_serial: slot.device_serial,
      status: slot.status,
    };
  }
}

export const equipmentService = new EquipmentService();

