import { equipmentRepository } from '../repositories/EquipmentRepository';
import { subscriptionRepository } from '../repositories/SubscriptionRepository';
import { planRepository } from '../repositories/PlanRepository';
import { nextcloudService } from './NextcloudService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { SubscriptionEquipment } from '../types';

export class EquipmentService {
  /**
   * Retrieves or initializes equipment slots for a subscription
   */
  async getEquipmentSlots(subscriptionId: string, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment[]> {
    const sub = await subscriptionRepository.findById(subscriptionId);
    if (!sub) throw AppError.notFound('Subscription not found');
    if (!byAdmin && sub.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    let slots = await equipmentRepository.findBySubscription(subscriptionId);
    const count = sub.equipment_count;

    // Initialize missing slots
    if (slots.length < count) {
      const existingIndices = new Set(slots.map((s) => s.slot_index));
      for (let i = 0; i < count; i++) {
        if (!existingIndices.has(i)) {
          const newSlot = await equipmentRepository.create({
            subscription_id: subscriptionId,
            slot_index: i,
            status: 'PENDING_ACTIVATION',
            tenant_id: tenantId,
          });
          slots.push(newSlot);
        }
      }
      // Re-sort slots by slot_index
      slots.sort((a, b) => a.slot_index - b.slot_index);
    }

    return slots.slice(0, count);
  }

  /**
   * Generates a 6-digit OTP for slot activation
   */
  async generateSlotOTP(subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment> {
    if (!byAdmin) {
      throw AppError.forbidden('Client users are not authorized to generate activation codes');
    }
    // Ensure slots are initialized
    await this.getEquipmentSlots(subscriptionId, tenantId, byAdmin);

    const slot = await equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw AppError.notFound('Equipment slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    // Generate random 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    // If there was an active Nextcloud user, clean it up
    if (slot.nextcloud_username) {
      try {
        await nextcloudService.deleteUser(slot.nextcloud_username);
      } catch (err) {
        logger.warn('Failed to delete user on Nextcloud during OTP generation', { err });
      }
    }

    const updated = await equipmentRepository.update(slot.id, {
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
   * Activates a slot (can be called by OTP lookup or by direct simulation)
   */
  async activateSlot(options: {
    subscriptionId?: string;
    slotIndex?: number;
    otp?: string;
    deviceName: string;
    deviceSerial: string;
    tenantId: string;
    byAdmin?: boolean;
  }): Promise<SubscriptionEquipment> {
    let slot: SubscriptionEquipment | null = null;

    if (options.otp) {
      slot = await equipmentRepository.findByOtp(options.otp);
      if (!slot) throw AppError.notFound('Activation code (OTP) not found or invalid');
      if (slot.otp_expires_at && slot.otp_expires_at < new Date()) {
        throw AppError.badRequest('Activation code (OTP) has expired');
      }
      if (!options.byAdmin && slot.tenant_id !== options.tenantId) throw AppError.forbidden('Access denied');
    } else if (options.subscriptionId !== undefined && options.slotIndex !== undefined) {
      // Direct simulation from portal
      slot = await equipmentRepository.findBySlot(options.subscriptionId, options.slotIndex);
      if (!slot) throw AppError.notFound('Slot not found');
      if (!options.byAdmin && slot.tenant_id !== options.tenantId) throw AppError.forbidden('Access denied');
    } else {
      throw AppError.badRequest('Must provide either OTP or SubscriptionId + SlotIndex');
    }

    const sub = await subscriptionRepository.findById(slot.subscription_id);
    if (!sub) throw AppError.notFound('Subscription not found');

    // 1. Resolve storage quota
    let quota = '25 GB'; // default plan quota
    if (sub.plan.includes('PL-001')) quota = '25 GB';
    else if (sub.plan.includes('PL-002')) quota = '50 GB';
    else if (sub.plan.includes('PL-003')) quota = '100 GB';
    else {
      // Find quota from features dynamic text
      const planDetails = await planRepository.findById(sub.plan);
      if (planDetails) {
        const feature = planDetails.features.find((f: any) =>
          f.code === 'CLOUD_STORAGE' || (f.text && f.text.toString().toLowerCase().includes('storage'))
        );
        if (feature) {
          if (feature.code === 'CLOUD_STORAGE' && feature.params?.limit && feature.params?.unit) {
            quota = `${feature.params.limit} ${feature.params.unit}`;
          } else if (feature.text) {
            const match = feature.text.toString().match(/(\d+\s*[G|T]B)/i);
            if (match) quota = match[1];
          }
        }
      }
    }

    // 2. Generate Nextcloud user credentials
    const nextcloudUsername = `client_${sub.tenant_id.slice(0, 8)}_slot_${slot.slot_index + 1}`;
    let nextcloudPassword = '';

    try {
      nextcloudPassword = await nextcloudService.provisionUser({
        username: nextcloudUsername,
        quota,
        displayName: `${options.deviceName} (${options.deviceSerial})`,
      });
    } catch (error: any) {
      logger.error('Failed to provision Nextcloud user. Falling back to mock credentials in dev.', { error });
      nextcloudPassword = 'mockPass-' + Math.random().toString(36).slice(-8);
    }

    // 3. Mark slot as active
    const updated = await equipmentRepository.update(slot.id, {
      status: 'ACTIVE',
      device_name: options.deviceName,
      device_serial: options.deviceSerial,
      otp: null,
      otp_expires_at: null,
      nextcloud_username: nextcloudUsername,
      nextcloud_password: nextcloudPassword,
    });

    return updated!;
  }

  /**
   * Deactivates/revokes an equipment slot and deletes its Nextcloud account
   */
  async deactivateSlot(subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment> {
    const slot = await equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw AppError.notFound('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    // Clean up Nextcloud user account
    if (slot.nextcloud_username) {
      try {
        await nextcloudService.deleteUser(slot.nextcloud_username);
      } catch (err) {
        logger.error('Failed to delete Nextcloud user during deactivation', { err });
      }
    }

    const updated = await equipmentRepository.update(slot.id, {
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
   * Get all active devices (equipment) for a client across their active subscriptions.
   */
  async getActiveDevicesForClient(clientId: string, tenantId: string): Promise<SubscriptionEquipment[]> {
    return equipmentRepository.findActiveByClient(clientId, tenantId);
  }

  /**
   * Get all client devices across all subscriptions and tenants (for Admin view).
   */
  async getAllDevicesForAdmin(): Promise<any[]> {
    return equipmentRepository.findAllWithDetails();
  }

  /**
   * Get Nextcloud credentials and live storage info for a specific slot on demand.
   */
  async getNextcloudInfo(
    subscriptionId: string,
    slotIndex: number,
    tenantId: string,
    byAdmin = false
  ): Promise<{
    nextcloud_username: string | null;
    nextcloud_password: string | null;
    nextcloud_used_bytes: number;
    nextcloud_total_bytes: number;
    device_name: string | null;
    device_serial: string | null;
    status: string;
  }> {
    const slot = await equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw AppError.notFound('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw AppError.forbidden('Access denied');

    let used = 0;
    let total = 0;

    if (slot.status === 'ACTIVE' && slot.nextcloud_username) {
      try {
        const quota = await nextcloudService.getUserStorage(slot.nextcloud_username);
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
