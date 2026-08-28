import { equipmentRepository, EquipmentRepository } from '@modules/equipment/repositories/EquipmentRepository';
import { subscriptionRepository, SubscriptionRepository } from '@modules/subscriptions';
import { planRepository, PlanRepository } from '@modules/subscriptions';
import { nextcloudService, NextcloudService } from '@modules/system';
import { rmmPatchService, RmmPatchService } from '@modules/rmm/services/RmmPatchService';
import { AgentHelloPayload, agentGateway } from '@modules/rmm/services/AgentGateway';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ExternalServiceError,
  ConflictError,
} from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { SubscriptionEquipment, EquipmentWithDetails, SubscriptionStatus } from '@shared/types';
import crypto from 'crypto';

export interface BindAndActivateSlotOptions {
  code: string;
  subscriptionId: string;
  slotIndex: number;
  deviceName?: string;
  deviceSerial?: string;
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

  private get equipmentRepository(): EquipmentRepository {
    return this.equipmentRepo || equipmentRepository;
  }

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private get planRepository(): PlanRepository {
    return this.planRepo || planRepository;
  }

  private get nextcloudService(): NextcloudService {
    return this.nextcloudSvc || nextcloudService;
  }

  private get rmmPatchService(): RmmPatchService {
    return this.rmmPatchSvc || rmmPatchService;
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
        const newSlot = await this.equipmentRepository.create({
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
    const sub = await this.subRepo.findById(subscriptionId);
    if (!sub) throw new NotFoundError('Subscription not found');
    if (!byAdmin && sub.tenant_id !== tenantId) throw new ForbiddenError('Access denied');

    const existingSlots = await this.equipmentRepository.findBySubscription(subscriptionId);
    const allSlots = await this.ensureSlotsInitialized(subscriptionId, sub.equipment_count, tenantId, existingSlots);
    return allSlots.slice(0, sub.equipment_count);
  }

  /**
   * Generates a 64-char per-device agent secret used to authenticate the
   * remote endpoint agent when it connects and claims identity updates.
   */
  private generateAgentToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Reconciles agent-discovered identity (hostname/serial) against a device
   * slot. The remote agent is the authoritative source of truth, so detected
   * values overwrite the customer-entered device fields. When the slot carries
   * a per-device agent_token, a matching secret on the WebSocket connection is
   * required before any write is applied; legacy slots without a token are
   * trusted in lenient mode.
   */
  async reconcileAgentIdentity(
    equipmentId: string,
    hello: AgentHelloPayload,
    token: string | null
  ): Promise<void> {
    const hostname = (hello.hostname || '').trim();
    const serial = (hello.serial_number || '').trim();
    if (!hostname && !serial) {
      logger.warn('[EquipmentService] Agent hello carried no identity; skipping reconcile', { equipmentId });
      return;
    }

    const slot =
      (await this.equipmentRepository.findByAgentInstanceId(equipmentId)) ||
      (await this.equipmentRepository.findById(equipmentId));
    if (!slot) {
      logger.warn('[EquipmentService] No equipment record for connecting agent', { equipmentId });
      return;
    }

    if (slot.agent_token) {
      if (!token || token !== slot.agent_token) {
        logger.warn('[EquipmentService] Agent token mismatch; identity write rejected', { equipmentId });
        return;
      }
    } else {
      logger.info('[EquipmentService] Slot has no agent_token; trusting hello in lenient mode', { equipmentId });
    }

    const identity: { hostname?: string; serial?: string; lastSeenAt: Date } = {
      lastSeenAt: new Date(),
    };
    if (hostname) identity.hostname = hostname;
    if (serial) identity.serial = serial;

    const updated = await this.equipmentRepository.updateAgentIdentity(equipmentId, identity);
    if (updated) {
      logger.info('[EquipmentService] Reconciled agent identity for device', {
        equipmentId,
        hostname: hostname || null,
        serial: serial || null,
      });
    }
  }

  /**
   * Returns the agent-discovered identity prefill for an agent-issued pairing
   * code, so clients can confirm device details instead of typing them from
   * memory. The code is resolved against the live agent gateway registry.
   */
  async getAgentIdentityByOtp(
    otp: string,
    _tenantId: string,
    _byAdmin = false
  ): Promise<{ hostname: string | null; serial: string | null; lastSeenAt: Date | null }> {
    const entry = agentGateway.getPairingByCode(otp);
    if (!entry) throw new NotFoundError('Activation code (OTP) not found or invalid');

    return {
      hostname: (entry.hello.hostname || '').trim() || null,
      serial: (entry.hello.serial_number || '').trim() || null,
      lastSeenAt: new Date(entry.hello.timestamp ?? Date.now()),
    };
  }

  /**
   * Safely attempts to remove Nextcloud user account without breaking workflow.
   */
  private async cleanupNextcloudUser(username: string): Promise<void> {
    try {
      await this.nextcloudService.deleteUser(username);
    } catch (err) {
      logger.warn('Failed to delete Nextcloud user', { username, err });
    }
  }

  /**
   * Binds the physical agent behind an agent-issued pairing code to a specific
   * subscription slot and activates the device. The agent is the source of
   * truth for identity (hostname/serial overridden when still unset), Nextcloud
   * + RMM are provisioned, and a freshly generated per-device secret is pushed
   * to the agent over the WebSocket. Returns the slot without the secret.
   */
  async bindAndActivateSlot(options: BindAndActivateSlotOptions): Promise<SubscriptionEquipment> {
    const entry = agentGateway.getPairingByCode(options.code);
    if (!entry) throw new NotFoundError('Activation code (OTP) not found or invalid');

    const slot = await this.equipmentRepository.findBySlot(options.subscriptionId, options.slotIndex);
    if (!slot) throw new NotFoundError('Equipment slot not found');
    if (!options.byAdmin && slot.tenant_id !== options.tenantId) throw new ForbiddenError('Access denied');
    if (slot.status === 'ACTIVE') {
      throw new ConflictError('Slot is already active');
    }
    if (slot.agent_instance_id && slot.agent_instance_id !== entry.agentId) {
      throw new ConflictError('Slot is already bound to a different agent');
    }

    const hostname = (entry.hello.hostname || '').trim();
    const serial = (entry.hello.serial_number || '').trim();
    const deviceName = hostname || options.deviceName || `Workstation-${options.slotIndex + 1}`;
    const deviceSerial = serial || options.deviceSerial || `SN-SIM-${Math.floor(100000 + Math.random() * 900000)}`;

    // Provision Nextcloud + RMM first so failures surface before the slot is touched.
    const sub = await this.subRepo.findById(slot.subscription_id);
    if (!sub) throw new NotFoundError('Subscription not found');

    const quota = await this.resolveStorageQuota(sub.plan);
    const username = `client_${sub.tenant_id.slice(0, 8)}_slot_${slot.slot_index + 1}`;
    const displayName = `${deviceName} (${deviceSerial})`;
    const password = await this.provisionNextcloudUser(username, quota, displayName);

    const token = this.generateAgentToken();
    const updated = await this.equipmentRepository.update(slot.id, {
      status: 'ACTIVE',
      device_name: deviceName,
      device_serial: deviceSerial,
      agent_instance_id: entry.agentId,
      agent_hostname: hostname || deviceName,
      agent_serial: serial || deviceSerial,
      agent_last_seen_at: new Date(),
      agent_token: token,
      otp: null,
      otp_expires_at: null,
      nextcloud_username: username,
      nextcloud_password: password,
    });

    // Auto-provision equipment into Zabbix RMM.
    try {
      await this.rmmPatchService.triggerPatchScan(slot.id, slot.tenant_id);
      logger.info('Auto-provisioned equipment to RMM/Zabbix upon slot binding', { equipmentId: slot.id, deviceName });
    } catch (err) {
      logger.warn('Deferred RMM auto-provisioning on slot binding', { equipmentId: slot.id, err });
    }

    // Deliver the secret + binding to the agent. If the socket dropped in the
    // meantime, roll back the half-bound slot and instruct the user to retry.
    const bound = agentGateway.bindAgent(entry.agentId, slot.id, token);
    if (!bound) {
      await this.equipmentRepository.update(slot.id, {
        status: 'PENDING_ACTIVATION',
        agent_instance_id: null,
        agent_hostname: null,
        agent_serial: null,
        agent_token: null,
      });
      await this.cleanupNextcloudUser(username);
      throw new ValidationError('Agent went offline; please retry activation while the device is connected');
    }

    return this.stripSecrets(updated!);
  }

  /**
   * Returns the physical agent target for a slot identifier, so downstream
   * controllers can route commands by slot UUID while agents are addressed by
   * their stable install UUID.
   */
  async resolveAgentIdForSlot(targetId: string): Promise<string> {
    const slot = await this.equipmentRepository.findByAgentInstanceId(targetId);
    if (slot) return targetId;
    const equipment = await this.equipmentRepository.findById(targetId);
    if (equipment?.agent_instance_id) return equipment.agent_instance_id;
    return targetId;
  }

  private stripSecrets<T extends SubscriptionEquipment>(slot: T): Omit<T, 'agent_token'> {
    const { agent_token, ...rest } = slot as any;
    void agent_token;
    return rest as Omit<T, 'agent_token'>;
  }

  /**
   * Resolves storage quota string from subscription plan or plan details.
   */
  async resolveStorageQuota(planId: string): Promise<string> {
    if (planId.includes('PL-001')) return '25 GB';
    if (planId.includes('PL-002')) return '50 GB';
    if (planId.includes('PL-003')) return '100 GB';

    const planDetails = await this.planRepository.findById(planId);
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
   * Provisions Nextcloud user credentials. Throws ExternalServiceError on failure.
   */
  private async provisionNextcloudUser(
    username: string,
    quota: string,
    displayName: string
  ): Promise<string> {
    try {
      return await this.nextcloudService.provisionUser({
        username,
        quota,
        displayName,
      });
    } catch (error) {
      logger.error('Failed to provision Nextcloud user', { username, error });
      throw new ExternalServiceError('Failed to provision Nextcloud user credentials', {
        service: 'nextcloud',
        username,
        cause: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Deactivates/revokes an equipment slot and deletes its Nextcloud account.
   */
  async deactivateSlot(subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment> {
    const slot = await this.equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw new NotFoundError('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw new ForbiddenError('Access denied');

    if (slot.nextcloud_username) {
      await this.cleanupNextcloudUser(slot.nextcloud_username);
    }

    const updated = await this.equipmentRepository.update(slot.id, {
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
          const telemetry = await this.rmmPatchService.triggerPatchScan(dev.id, dev.tenant_id, true);
          if (telemetry) {
            dev.agent_status = telemetry.agent_status ?? 'ONLINE';
            dev.cpu_usage = telemetry.cpu_usage;
            dev.memory_usage = telemetry.memory_usage;
            dev.disk_usage = telemetry.disk_usage;
            dev.disk_used_gb = telemetry.disk_used_gb;
            dev.disk_total_gb = telemetry.disk_total_gb;
            dev.pending_patch_count = telemetry.pending_patch_count;
            dev.last_sync_at = telemetry.last_sync_at ? new Date(telemetry.last_sync_at) : null;
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
    const hasTenantFind = typeof this.equipmentRepository.findActiveByTenant === 'function';
    let devices = (!isUuid && hasTenantFind)
      ? await this.equipmentRepository.findActiveByTenant(tenantId)
      : await this.equipmentRepository.findActiveByClient(clientId, tenantId);

    if (devices.length === 0 && hasTenantFind) {
      devices = await this.equipmentRepository.findActiveByTenant(tenantId);
    }

    await this.ensureTelemetryProvisioned(devices);
    const refreshed = (!isUuid && hasTenantFind)
      ? await this.equipmentRepository.findActiveByTenant(tenantId)
      : await this.equipmentRepository.findActiveByClient(clientId, tenantId);

    return refreshed.length > 0 ? refreshed : devices;
  }

  /**
   * Gets all client devices across all subscriptions and tenants (for Admin view).
   */
  async getAllDevicesForAdmin(): Promise<EquipmentWithDetails[]> {
    const activeSubs = await this.subRepo.findAllActive();
    for (const sub of activeSubs) {
      await this.getEquipmentSlots(sub.id, sub.tenant_id, true);
    }
    const devices = await this.equipmentRepository.findAllWithDetails();
    await this.ensureTelemetryProvisioned(devices);
    return this.equipmentRepository.findAllWithDetails();
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
    const slot = await this.equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw new NotFoundError('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw new ForbiddenError('Access denied');

    let used = 0;
    let total = 0;

    if (slot.status === 'ACTIVE' && slot.nextcloud_username) {
      try {
        const quota = await this.nextcloudService.getUserStorage(slot.nextcloud_username);
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

  /**
   * Directly provisions/adds a device for an ADMIN without requiring an upfront paid subscription.
   */
  async addAdminDevice(options: {
    deviceName: string;
    deviceSerial?: string;
    tenantId: string;
    adminUserId: string;
  }): Promise<SubscriptionEquipment> {
    if (!options.deviceName || options.deviceName.trim().length === 0) {
      throw new ValidationError('Device name is required');
    }

    const tenantSubs = await this.subRepo.findByTenant(options.tenantId);
    let sub = tenantSubs.find((s) => s.status === 'ACTIVE' || s.status === 'EXPIRING');
    if (!sub) {
      const renewalDate = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
      sub = await this.subRepo.create({
        client_id: options.adminUserId,
        tenant_id: options.tenantId,
        service_name: 'Admin Infrastructure',
        plan: 'PL-003',
        equipment_count: 50,
        renewal_date: renewalDate,
        status: SubscriptionStatus.ACTIVE,
      });
    }

    const existingSlots = await this.equipmentRepository.findBySubscription(sub.id);
    const targetSlot = existingSlots.find((s) => s.status !== 'ACTIVE' && !s.otp);
    const slotIndex = targetSlot ? targetSlot.slot_index : existingSlots.length;

    if (slotIndex >= sub.equipment_count) {
      await this.subRepo.updatePlan(sub.id, sub.plan, slotIndex + 10);
    }

    const serial = options.deviceSerial?.trim() || `SN-ADM-${Math.floor(100000 + Math.random() * 900000)}`;
    const username = `admin_${options.tenantId.slice(0, 8)}_slot_${slotIndex + 1}`;
    const displayName = `${options.deviceName.trim()} (${serial})`;
    const password = await this.provisionNextcloudUser(username, '100 GB', displayName);

    let slot: SubscriptionEquipment;
    if (targetSlot) {
      slot = (await this.equipmentRepository.update(targetSlot.id, {
        status: 'ACTIVE',
        device_name: options.deviceName.trim(),
        device_serial: serial,
        otp: null,
        otp_expires_at: null,
        nextcloud_username: username,
        nextcloud_password: password,
      }))!;
    } else {
      slot = await this.equipmentRepository.create({
        subscription_id: sub.id,
        slot_index: slotIndex,
        status: 'ACTIVE',
        device_name: options.deviceName.trim(),
        device_serial: serial,
        nextcloud_username: username,
        nextcloud_password: password,
        tenant_id: options.tenantId,
      });
    }

    // Auto-provision equipment into Zabbix RMM
    try {
      await this.rmmPatchService.triggerPatchScan(slot.id, slot.tenant_id);
      logger.info('Auto-provisioned admin equipment to RMM/Zabbix', { equipmentId: slot.id, deviceName: options.deviceName });
    } catch (err) {
      logger.warn('Deferred RMM auto-provisioning on admin device creation', { equipmentId: slot.id, err });
    }

    return slot;
  }

  /**
   * Permanently deletes an admin-owned equipment record and cleans up associated external resources.
   * Client-owned equipment slots cannot be deleted through this endpoint.
   */
  async deleteAdminEquipment(equipmentId: string, _adminUserId: string): Promise<{ success: boolean; id: string }> {
    const equip = await this.equipmentRepository.findByIdWithDetails(equipmentId);
    if (!equip) {
      throw new NotFoundError('Equipment not found');
    }

    if (equip.client_role !== 'ADMIN') {
      throw new ForbiddenError('Only admin-owned equipment can be deleted. Client equipment slots must be managed through their subscription.');
    }

    if (equip.nextcloud_username) {
      await this.cleanupNextcloudUser(equip.nextcloud_username);
    }

    const deleted = await this.equipmentRepository.deleteById(equipmentId);
    if (!deleted) {
      throw new NotFoundError('Failed to delete equipment record');
    }

    logger.info('Admin deleted equipment record', { equipmentId, deviceName: equip.device_name });

    return { success: true, id: equipmentId };
  }
}

export const equipmentService = new EquipmentService();

