import { equipmentRepository, EquipmentRepository } from '@modules/equipment/repositories/EquipmentRepository';
import { subscriptionRepository, SubscriptionRepository } from '@modules/subscriptions';
import { planRepository, PlanRepository } from '@modules/subscriptions';
import { nextcloudService, NextcloudService, vaultwardenService, VaultwardenService } from '@modules/system';
import { rmmPatchService, RmmPatchService, AgentHelloPayload, agentGateway } from '@modules/rmm';
import { ticketRepository, TicketRepository } from '@modules/tickets';
import { HELPDESK_SUPPORT_FEATURE_CODE } from '@shared/config/constants';
import { DeviceVaultDetails } from '@shared/contracts';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ExternalServiceError,
  ConflictError,
} from '@shared/errors';
import { logger } from '@shared/utils/logger';
import { SubscriptionEquipment, EquipmentWithDetails, SubscriptionStatus, FEATURE_CODES, expandFeatureBundles } from '@shared/types';
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

/**
 * Domain service managing subscription hardware slots, Nextcloud cloud storage accounts,
 * remote agent identity reconciliation, and direct admin device provisioning.
 */
export class EquipmentService {
  /**
   * Initializes EquipmentService with equipment, subscription, plan, Nextcloud, RMM, and ticket dependencies.
   *
   * @param equipmentRepo - Equipment inventory repository
   * @param subscriptionRepo - Subscription repository
   * @param planRepo - Plan catalog repository
   * @param nextcloudSvc - Nextcloud user provisioning service
   * @param rmmPatchSvc - RMM patch & telemetry bridge service
   * @param ticketRepo - Ticket repository for quota calculation
   */
  constructor(
    private equipmentRepo: EquipmentRepository = equipmentRepository,
    private subscriptionRepo: SubscriptionRepository = subscriptionRepository,
    private planRepo: PlanRepository = planRepository,
    private nextcloudSvc: NextcloudService = nextcloudService,
    private rmmPatchSvc: RmmPatchService = rmmPatchService,
    private ticketRepo: TicketRepository = ticketRepository,
    private vaultwardenSvc: VaultwardenService = vaultwardenService,
  ) {}

  private get vaultwardenService(): VaultwardenService {
    return this.vaultwardenSvc || vaultwardenService;
  }

  private get equipmentRepository(): EquipmentRepository {
    return this.equipmentRepo || equipmentRepository;
  }

  private get subRepo(): SubscriptionRepository {
    return this.subscriptionRepo || subscriptionRepository;
  }

  private get planRepository(): PlanRepository {
    return this.planRepo || planRepository;
  }

  private get ticketsRepo(): TicketRepository {
    return this.ticketRepo || ticketRepository;
  }

  private get nextcloudService(): NextcloudService {
    return this.nextcloudSvc || nextcloudService;
  }

  private get rmmPatchService(): RmmPatchService {
    return this.rmmPatchSvc || rmmPatchService;
  }

  /**
   * Internal command method to initialize missing slots for a subscription.
   *
   * @param subscriptionId - Target subscription UUID
   * @param targetCount - Expected number of slots
   * @param tenantId - Tenant UUID
   * @param existingSlots - Array of currently allocated slots
   * @returns Complete array of SubscriptionEquipment slots
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
   *
   * @param subscriptionId - Subscription UUID
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if administrator
   * @returns Array of SubscriptionEquipment slots
   * @throws {NotFoundError} When subscription not found
   * @throws {ForbiddenError} When tenant access is disallowed
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
   *
   * @returns Hex-encoded crypto token
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
   *
   * @param equipmentId - Equipment slot or agent instance UUID
   * @param hello - Discovered identity metadata
   * @param token - Agent secret token
   */
  async reconcileAgentIdentity(
    equipmentId: string,
    hello: AgentHelloPayload,
    token: string | null
  ): Promise<void> {
    const slot =
      (await this.equipmentRepository.findByAgentInstanceId(equipmentId)) ||
      (await this.equipmentRepository.findById(equipmentId));

    if (!slot || slot.status === 'PENDING_ACTIVATION') {
      if (hello.binding_state === 'BOUND' || hello.slot_id || (token && token !== 'dev-token')) {
        logger.info('[EquipmentService] Agent claims bound state for unlinked/inactive slot; sending UNBIND', { equipmentId });
        agentGateway.unbindAgent(equipmentId, hello.slot_id);
      } else {
        logger.warn('[EquipmentService] No equipment record for connecting agent', { equipmentId });
      }
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

    // Link live connection to the active slot in agentGateway
    agentGateway.setAgentSlotId(equipmentId, slot.id);

    const hostname = (hello.hostname || '').trim();
    const serial = (hello.serial_number || '').trim();
    if (!hostname && !serial) {
      return;
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
   *
   * @param otp - 6-digit pairing code
   * @param _tenantId - Tenant UUID
   * @param _byAdmin - True if administrator
   * @returns Discovered hostname, serial, and last seen timestamp
   * @throws {NotFoundError} When pairing code is unknown or expired
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
   *
   * @param username - Nextcloud username
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
   *
   * @param options - BindAndActivateSlotOptions properties
   * @returns Activated SubscriptionEquipment slot
   * @throws {NotFoundError} When OTP, subscription, or slot is not found
   * @throws {ForbiddenError} When access across tenant is denied
   * @throws {ConflictError} When slot is already active or bound to different agent
   * @throws {ValidationError} When agent disconnects during binding handshake
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

    // Re-pairing an already-provisioned slot reuses the existing Nextcloud
    // account (preserving cloud data); a fresh slot provisions a new account.
    const reuseAccount = Boolean(slot.nextcloud_username && slot.nextcloud_password);

    let username: string;
    let password: string;
    if (reuseAccount) {
      username = slot.nextcloud_username!;
      password = slot.nextcloud_password!;
    } else {
      // Provision Nextcloud first so failures surface before the slot is touched.
      const sub = await this.subRepo.findById(slot.subscription_id);
      if (!sub) throw new NotFoundError('Subscription not found');

      const quota = await this.resolveStorageQuota(sub.plan);
      username = `client_${sub.tenant_id.slice(0, 8)}_slot_${slot.slot_index + 1}`;
      const displayName = `${deviceName} (${deviceSerial})`;
      password = await this.provisionNextcloudUser(username, quota, displayName);
    }

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
        device_name: null,
        device_serial: null,
        agent_instance_id: null,
        agent_hostname: null,
        agent_serial: null,
        agent_token: null,
        nextcloud_username: null,
        nextcloud_password: null,
      });
      if (!reuseAccount) {
        await this.cleanupNextcloudUser(username);
      }
      throw new ValidationError('Agent went offline; please retry activation while the device is connected');
    }

    return this.stripSecrets(updated!);
  }

  /**
   * Unbinds an active slot so a replacement agent (e.g. after the PC was wiped
   * or the agent reinstalled) can re-pair against the same slot. The Nextcloud
   * account is preserved but its password is rotated, revoking the wiped
   * machine's access immediately. Returns the slot in PENDING_ACTIVATION state.
   *
   * @param subscriptionId - Subscription UUID
   * @param slotIndex - Zero-indexed slot position
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if administrator
   * @returns Unbound SubscriptionEquipment slot
   * @throws {NotFoundError} When slot not found
   * @throws {ForbiddenError} When access denied across tenant
   * @throws {ConflictError} When slot is not currently active
   */
  async unbindSlotForRepair(
    subscriptionId: string,
    slotIndex: number,
    tenantId: string,
    byAdmin = false
  ): Promise<SubscriptionEquipment> {
    const slot = await this.equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw new NotFoundError('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw new ForbiddenError('Access denied');
    if (slot.status !== 'ACTIVE') {
      throw new ConflictError('Slot must be active before it can be re-paired');
    }

    let nextcloudPassword = slot.nextcloud_password;
    if (slot.nextcloud_username) {
      try {
        nextcloudPassword = await this.nextcloudService.setUserPassword(slot.nextcloud_username);
      } catch (err) {
        logger.warn('Failed to rotate Nextcloud password during re-pair; keeping existing credentials', {
          username: slot.nextcloud_username,
          err,
        });
      }
    }

    const agentInstanceId = slot.agent_instance_id;
    const updated = await this.equipmentRepository.update(slot.id, {
      status: 'PENDING_ACTIVATION',
      agent_instance_id: null,
      agent_token: null,
      agent_hostname: null,
      agent_serial: null,
      agent_last_seen_at: null,
      ...(nextcloudPassword ? { nextcloud_password: nextcloudPassword } : {}),
    });

    if (agentInstanceId) {
      agentGateway.unbindAgent(agentInstanceId, slot.id);
    }

    return this.stripSecrets(updated!);
  }

  /**
   * Returns the physical agent target for a slot identifier, so downstream
   * controllers can route commands by slot UUID while agents are addressed by
   * their stable install UUID.
   *
   * @param targetId - Slot UUID or agent instance ID
   * @returns Resolved agent UUID
   */
  async resolveAgentIdForSlot(targetId: string): Promise<string> {
    const slot = await this.equipmentRepository.findByAgentInstanceId(targetId);
    if (slot) return targetId;
    const equipment = await this.equipmentRepository.findById(targetId);
    if (equipment?.agent_instance_id) return equipment.agent_instance_id;
    return targetId;
  }

  /**
   * Strips agent_token secret from slot response before returning to clients.
   *
   * @param slot - Slot entity
   * @returns Slot entity without agent_token
   */
  private stripSecrets<T extends SubscriptionEquipment>(slot: T): Omit<T, 'agent_token'> {
    const { agent_token, ...rest } = slot as any;
    void agent_token;
    return rest as Omit<T, 'agent_token'>;
  }

  /**
   * Resolves storage quota string from subscription plan or plan details.
   *
   * @param planId - Plan identifier
   * @returns Storage quota string (e.g. '50 GB')
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
   *
   * @param username - Nextcloud username
   * @param quota - Storage quota
   * @param displayName - Display name
   * @returns Generated Nextcloud user password
   * @throws {ExternalServiceError} When Nextcloud user creation fails
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
   *
   * @param subscriptionId - Subscription UUID
   * @param slotIndex - Slot position index
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if administrator
   * @returns Reset SubscriptionEquipment slot in PENDING_ACTIVATION state
   * @throws {NotFoundError} When slot is not found
   * @throws {ForbiddenError} When access denied across tenant boundary
   */
  async deactivateSlot(subscriptionId: string, slotIndex: number, tenantId: string, byAdmin = false): Promise<SubscriptionEquipment> {
    const slot = await this.equipmentRepository.findBySlot(subscriptionId, slotIndex);
    if (!slot) throw new NotFoundError('Slot not found');
    if (!byAdmin && slot.tenant_id !== tenantId) throw new ForbiddenError('Access denied');

    if (slot.nextcloud_username) {
      await this.cleanupNextcloudUser(slot.nextcloud_username);
    }

    const agentInstanceId = slot.agent_instance_id;
    const updated = await this.equipmentRepository.update(slot.id, {
      status: 'PENDING_ACTIVATION',
      device_name: null,
      device_serial: null,
      otp: null,
      otp_expires_at: null,
      nextcloud_username: null,
      nextcloud_password: null,
      agent_instance_id: null,
      agent_token: null,
      agent_hostname: null,
      agent_serial: null,
      agent_last_seen_at: null,
    });

    if (agentInstanceId) {
      agentGateway.unbindAgent(agentInstanceId, slot.id);
    }

    return updated!;
  }

  /**
   * Helper method to auto-provision missing telemetry for active devices.
   *
   * @param devices - Array of equipment device entities
   * @returns Devices array enriched with telemetry
   */
  private async ensureTelemetryProvisioned<T extends SubscriptionEquipment>(devices: T[]): Promise<T[]> {
    const missingTelemetry = devices.filter((d) => d.status === 'ACTIVE' && (d.cpu_usage == null || d.agent_status == null));
    if (missingTelemetry.length === 0) return devices;

    for (const dev of devices) {
      if (dev.status === 'ACTIVE' && (dev.cpu_usage == null || dev.agent_status == null)) {
        try {
          const telemetry = await this.rmmPatchService.triggerPatchScan(dev.id, dev.tenant_id, true);
          if (telemetry) {
            dev.agent_status = telemetry.agent_status ?? (process.env.NODE_ENV === 'production' ? 'UNKNOWN' : 'ONLINE');
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
            dev.agent_status = process.env.NODE_ENV === 'production' ? 'UNKNOWN' : 'ONLINE';
          }
        }
      }
    }

    return devices;
  }

  /**
   * Gets all active devices (equipment) for a client across their active subscriptions.
   *
   * @param clientId - Client user UUID
   * @param tenantId - Tenant UUID
   * @returns Array of active SubscriptionEquipment devices with telemetry
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

    const result = refreshed.length > 0 ? refreshed : devices;
    return this.enrichDevicesWithQuota(result);
  }

  /**
   * Evaluates the real-time operational status of an endpoint.
   * If live WebSocket is connected, returns 'ONLINE'.
   * If not connected and latest sync/seen activity was within 15 minutes, returns current telemetry status.
   * If no activity for > 15 minutes, marks the workstation as 'OFFLINE'.
   */
  resolveLiveAgentStatus(device: SubscriptionEquipment): string {
    if (device.status !== 'ACTIVE') {
      return (device as any).agent_status || 'UNKNOWN';
    }
    if (typeof agentGateway?.isAgentConnected === 'function' && agentGateway.isAgentConnected(device.id)) {
      return 'ONLINE';
    }
    const lastSync = (device as any).last_sync_at ? new Date((device as any).last_sync_at).getTime() : 0;
    const lastSeen = device.agent_last_seen_at ? new Date(device.agent_last_seen_at).getTime() : 0;
    const latest = Math.max(lastSync, lastSeen);
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    if (latest > fifteenMinutesAgo) {
      return (device as any).agent_status || 'ONLINE';
    }
    return 'OFFLINE';
  }

  /**
   * Enriches equipment slots with their current month ticket consumption count, plan limit, and reconciled agent status.
   *
   * @param devices - Array of SubscriptionEquipment
   * @returns Enriched array with monthly_ticket_count, monthly_ticket_limit, and live agent_status
   */
  private async enrichDevicesWithQuota<T extends SubscriptionEquipment>(devices: T[]): Promise<T[]> {
    if (devices.length === 0) return devices;

    const subPlanLimitMap = new Map<string, number | null>();
    const subPlanNameMap = new Map<string, string | null>();

    for (const device of devices) {
      const count = await this.ticketsRepo.countEquipmentTicketsInCurrentMonth(device.id);
      device.monthly_ticket_count = count;
      (device as any).agent_status = this.resolveLiveAgentStatus(device);

      if (device.subscription_id) {
        if (!subPlanLimitMap.has(device.subscription_id)) {
          const sub = await this.subRepo.findById(device.subscription_id);
          subPlanNameMap.set(device.subscription_id, sub?.plan || null);
          if (sub?.plan) {
            const plan = await this.planRepository.findById(sub.plan);
            let limit: number | null = null;
            if (plan && Array.isArray(plan.features)) {
              for (const f of plan.features) {
                if (f.code === HELPDESK_SUPPORT_FEATURE_CODE && f.included !== false) {
                  const val = f.params?.limit;
                  if (!val || val === 'Unlimited') {
                    limit = null;
                  } else {
                    const parsed = parseInt(String(val), 10);
                    if (!isNaN(parsed)) limit = parsed;
                  }
                  break;
                }
              }
            }
            subPlanLimitMap.set(device.subscription_id, limit);
          } else {
            subPlanLimitMap.set(device.subscription_id, null);
          }
        }
        device.monthly_ticket_limit = subPlanLimitMap.get(device.subscription_id) ?? null;
        if (!(device as any).plan && subPlanNameMap.get(device.subscription_id)) {
          (device as any).plan = subPlanNameMap.get(device.subscription_id);
        }
      }
    }

    return devices;
  }

  /**
   * Performs automated data integrity reconciliation:
   * 1. Resets any PENDING_ACTIVATION slots that have duplicate device serials or orphaned Nextcloud accounts.
   * 2. Cleans up zombie half-bound slots so they can be fresh paired.
   */
  async reconcileEquipmentSlots(): Promise<{ cleanedSlots: number }> {
    const allSlots = await this.equipmentRepository.findAllWithDetails();
    let cleanedSlots = 0;

    const activeSerials = new Set<string>();
    for (const slot of allSlots) {
      if (slot.status === 'ACTIVE' && slot.device_serial) {
        activeSerials.add(slot.device_serial.toLowerCase());
      }
    }

    for (const slot of allSlots) {
      if (
        slot.status === 'PENDING_ACTIVATION' &&
        slot.device_serial &&
        activeSerials.has(slot.device_serial.toLowerCase())
      ) {
        await this.equipmentRepository.update(slot.id, {
          device_name: null,
          device_serial: null,
          agent_instance_id: null,
          agent_hostname: null,
          agent_serial: null,
          agent_token: null,
          nextcloud_username: null,
          nextcloud_password: null,
        });
        cleanedSlots++;
        logger.info(`[EquipmentService] Cleaned zombie duplicate slot ${slot.id} (Slot #${slot.slot_index})`);
      }
    }

    return { cleanedSlots };
  }

  /**
   * Gets all client devices across all subscriptions and tenants (for Admin view).
   *
   * @returns Array of all EquipmentWithDetails devices with telemetry
   */
  async getAllDevicesForAdmin(): Promise<EquipmentWithDetails[]> {
    await this.reconcileEquipmentSlots();
    const activeSubs = await this.subRepo.findAllActive();
    for (const sub of activeSubs) {
      await this.getEquipmentSlots(sub.id, sub.tenant_id, true);
    }
    const devices = await this.equipmentRepository.findAllWithDetails();
    await this.ensureTelemetryProvisioned(devices);
    const refreshed = await this.equipmentRepository.findAllWithDetails();
    return this.enrichDevicesWithQuota(refreshed);
  }

  /**
   * Gets Nextcloud credentials and live storage info for a specific slot on demand.
   *
   * @param subscriptionId - Subscription UUID
   * @param slotIndex - Slot index
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if administrator
   * @returns NextcloudStorageInfo credentials and storage metrics
   * @throws {NotFoundError} When slot not found
   * @throws {ForbiddenError} When access denied across tenant
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
   * Directly provisions/adds a device for an ADMIN by binding a live physical agent via pairing OTP code.
   * Auto-detects hardware identity (hostname, serial), provisions Nextcloud storage, and establishes live WebSocket connection.
   *
   * @param options - Admin device provisioning parameters including required pairing OTP
   * @returns Provisioned SubscriptionEquipment slot
   * @throws {ValidationError} When device name or OTP is empty, or agent disconnects during binding
   * @throws {NotFoundError} When provided pairing OTP code is invalid or expired
   */
  async addAdminDevice(options: {
    deviceName: string;
    deviceSerial?: string;
    tenantId: string;
    adminUserId: string;
    otp: string;
  }): Promise<SubscriptionEquipment> {
    const rawOtp = options.otp?.trim();
    if (!rawOtp || !/^\d{6}$/.test(rawOtp)) {
      throw new ValidationError('A valid 6-digit activation code (OTP) is required');
    }

    const pairingEntry = agentGateway.getPairingByCode(rawOtp);
    if (!pairingEntry) {
      throw new NotFoundError('Activation code (OTP) not found or invalid');
    }

    const detectedHostname = (pairingEntry.hello.hostname || '').trim();
    const detectedSerial = (pairingEntry.hello.serial_number || '').trim();

    const effectiveDeviceName = options.deviceName?.trim() || detectedHostname;
    if (!effectiveDeviceName) {
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

    const serial = options.deviceSerial?.trim() || detectedSerial || `SN-ADM-${Math.floor(100000 + Math.random() * 900000)}`;
    const username = `admin_${options.tenantId.slice(0, 8)}_slot_${slotIndex + 1}`;
    const displayName = `${effectiveDeviceName} (${serial})`;
    const password = await this.provisionNextcloudUser(username, '100 GB', displayName);

    const agentToken = pairingEntry ? this.generateAgentToken() : undefined;

    let slot: SubscriptionEquipment;
    if (targetSlot) {
      slot = (await this.equipmentRepository.update(targetSlot.id, {
        status: 'ACTIVE',
        device_name: effectiveDeviceName,
        device_serial: serial,
        agent_instance_id: pairingEntry ? pairingEntry.agentId : targetSlot.agent_instance_id,
        agent_hostname: pairingEntry ? (detectedHostname || effectiveDeviceName) : targetSlot.agent_hostname,
        agent_serial: pairingEntry ? (detectedSerial || serial) : targetSlot.agent_serial,
        agent_last_seen_at: pairingEntry ? new Date() : targetSlot.agent_last_seen_at,
        agent_token: agentToken ?? targetSlot.agent_token,
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
        device_name: effectiveDeviceName,
        device_serial: serial,
        agent_instance_id: pairingEntry ? pairingEntry.agentId : null,
        agent_hostname: pairingEntry ? (detectedHostname || effectiveDeviceName) : null,
        agent_serial: pairingEntry ? (detectedSerial || serial) : null,
        agent_last_seen_at: pairingEntry ? new Date() : null,
        agent_token: agentToken ?? null,
        nextcloud_username: username,
        nextcloud_password: password,
        tenant_id: options.tenantId,
      });
    }

    // Auto-provision equipment into Zabbix RMM
    try {
      await this.rmmPatchService.triggerPatchScan(slot.id, slot.tenant_id);
      logger.info('Auto-provisioned admin equipment to RMM/Zabbix', { equipmentId: slot.id, deviceName: effectiveDeviceName });
    } catch (err) {
      logger.warn('Deferred RMM auto-provisioning on admin device creation', { equipmentId: slot.id, err });
    }

    // If paired with an agent, bind WebSocket connection
    if (pairingEntry && agentToken) {
      const bound = agentGateway.bindAgent(pairingEntry.agentId, slot.id, agentToken);
      if (!bound) {
        await this.equipmentRepository.update(slot.id, {
          status: 'PENDING_ACTIVATION',
          agent_instance_id: null,
          agent_hostname: null,
          agent_serial: null,
          agent_token: null,
        });
        await this.cleanupNextcloudUser(username);
        throw new ValidationError('Agent went offline; please retry pairing while the device is connected');
      }
    }

    return slot;
  }

  /**
   * Permanently deletes an admin-owned equipment record and cleans up associated external resources.
   * Client-owned equipment slots cannot be deleted through this endpoint.
   *
   * @param equipmentId - Equipment UUID
   * @param _adminUserId - Admin user UUID
   * @returns Object with deletion success flag and ID
   * @throws {NotFoundError} When equipment record is missing
   * @throws {ForbiddenError} When attempting to delete non-admin client equipment
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

  /**
   * Retrieves the current Vaultwarden password management status and connection metadata for a device slot.
   *
   * @param equipmentId - Equipment slot UUID
   * @param tenantId - Tenant UUID requesting access
   * @param byAdmin - True if caller is system administrator
   * @returns DeviceVaultDetails record
   * @throws {NotFoundError} When equipment does not exist
   * @throws {ForbiddenError} When tenant boundary is violated
   */
  async getDeviceVault(
    equipmentId: string,
    tenantId: string,
    byAdmin = false
  ): Promise<DeviceVaultDetails> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment slot not found');
    }
    if (!byAdmin && equipment.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied: Equipment belongs to another tenant');
    }
    if (!byAdmin) {
      await this.enforceDevicePasswordManagerEntitlement(equipment.subscription_id);
    }

    const deviceName = equipment.device_name || equipment.agent_hostname || `Device-${equipment.slot_index + 1}`;
    const deviceEmail = `device_${equipment.id.slice(0, 8)}@${tenantId.slice(0, 8)}.local`;
    const status = (equipment.vaultwarden_status as any) || 'UNPROVISIONED';

    return {
      equipmentId: equipment.id,
      deviceName,
      status,
      orgId: equipment.vaultwarden_org_id || equipment.tenant_id,
      collectionId: equipment.vaultwarden_collection_id || null,
      deviceEmail,
      lastSyncedAt: equipment.vaultwarden_last_synced_at ? equipment.vaultwarden_last_synced_at.toISOString() : null,
      itemCount: status === 'ACTIVE' ? 1 : 0,
    };
  }

  /**
   * Provisions a dedicated Vaultwarden collection and device identity for an equipment slot.
   *
   * @param equipmentId - Equipment slot UUID
   * @param tenantId - Tenant UUID
   * @param byAdmin - True if administrator
   * @returns Updated DeviceVaultDetails
   * @throws {NotFoundError} When equipment does not exist
   * @throws {ForbiddenError} When tenant boundary is violated
   */
  async provisionDeviceVault(
    equipmentId: string,
    tenantId: string,
    byAdmin = false
  ): Promise<DeviceVaultDetails> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment slot not found');
    }
    if (!byAdmin && equipment.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied: Equipment belongs to another tenant');
    }
    if (!byAdmin) {
      await this.enforceDevicePasswordManagerEntitlement(equipment.subscription_id);
    }

    const targetOrgId = equipment.vaultwarden_org_id || equipment.tenant_id;
    const deviceName = equipment.device_name || equipment.agent_hostname || `Device-${equipment.slot_index + 1}`;
    const deviceEmail = `device_${equipment.id.slice(0, 8)}@${tenantId.slice(0, 8)}.local`;

    // 1. Create or ensure Bitwarden Collection
    const collectionId = await this.vaultwardenService.createDeviceCollection(targetOrgId, deviceName);

    // 2. Provision device account scoped to this collection
    const provisionResult = await this.vaultwardenService.provisionDeviceAccount(targetOrgId, collectionId, deviceEmail);

    // 3. Update database entity
    const updated = await this.equipmentRepository.update(equipment.id, {
      vaultwarden_org_id: targetOrgId,
      vaultwarden_collection_id: collectionId,
      vaultwarden_device_user_id: provisionResult.userId,
      vaultwarden_status: 'ACTIVE',
      vaultwarden_last_synced_at: new Date(),
    });

    logger.info(`Provisioned Vaultwarden device vault for equipment ${equipment.id} (Tenant: ${tenantId})`);

    return {
      equipmentId: equipment.id,
      deviceName,
      status: 'ACTIVE',
      orgId: targetOrgId,
      collectionId,
      deviceEmail,
      lastSyncedAt: updated?.vaultwarden_last_synced_at ? updated.vaultwarden_last_synced_at.toISOString() : new Date().toISOString(),
      itemCount: 1,
      message: 'Device vault provisioned successfully with Bitwarden collection',
    };
  }

  /**
   * Revokes and locks active Vaultwarden credentials and sessions for an equipment slot.
   *
   * @param equipmentId - Equipment slot UUID
   * @param tenantId - Tenant UUID
   * @param reason - Optional audit reason
   * @param byAdmin - True if administrator
   * @returns Updated DeviceVaultDetails
   * @throws {NotFoundError} When equipment does not exist
   * @throws {ForbiddenError} When tenant boundary is violated
   */
  async revokeDeviceVault(
    equipmentId: string,
    tenantId: string,
    reason?: string,
    byAdmin = false
  ): Promise<DeviceVaultDetails> {
    const equipment = await this.equipmentRepository.findById(equipmentId);
    if (!equipment) {
      throw new NotFoundError('Equipment slot not found');
    }
    if (!byAdmin && equipment.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied: Equipment belongs to another tenant');
    }
    if (!byAdmin) {
      await this.enforceDevicePasswordManagerEntitlement(equipment.subscription_id);
    }

    const targetOrgId = equipment.vaultwarden_org_id || equipment.tenant_id;
    if (equipment.vaultwarden_device_user_id) {
      await this.vaultwardenService.revokeDeviceSession(targetOrgId, equipment.vaultwarden_device_user_id);
    }

    const updated = await this.equipmentRepository.update(equipment.id, {
      vaultwarden_status: 'LOCKED',
      vaultwarden_last_synced_at: new Date(),
    });

    logger.warn(`Revoked Vaultwarden device vault session for equipment ${equipment.id} (Reason: ${reason || 'Emergency lock'})`);

    const deviceName = equipment.device_name || equipment.agent_hostname || `Device-${equipment.slot_index + 1}`;
    const deviceEmail = `device_${equipment.id.slice(0, 8)}@${tenantId.slice(0, 8)}.local`;

    return {
      equipmentId: equipment.id,
      deviceName,
      status: 'LOCKED',
      orgId: targetOrgId,
      collectionId: equipment.vaultwarden_collection_id,
      deviceEmail,
      lastSyncedAt: updated?.vaultwarden_last_synced_at ? updated.vaultwarden_last_synced_at.toISOString() : new Date().toISOString(),
      itemCount: 0,
      message: 'Device vault session revoked successfully',
    };
  }

  /**
   * Enforces that the equipment slot's subscription plan includes the PASSWORD_MANAGER feature.
   *
   * @param subscriptionId - Subscription UUID
   * @throws {ForbiddenError} When slot lacks entitlement
   */
  private async enforceDevicePasswordManagerEntitlement(subscriptionId?: string | null): Promise<void> {
    if (!subscriptionId) {
      throw new ForbiddenError('Subscription plan does not include Password Manager entitlement');
    }

    const sub = await this.subRepo.findById(subscriptionId);
    if (!sub || !sub.plan) {
      throw new ForbiddenError('Subscription plan does not include Password Manager entitlement');
    }

    const plan = await this.planRepository.findById(sub.plan);
    if (!plan || !Array.isArray(plan.features)) {
      throw new ForbiddenError('Subscription plan does not include Password Manager entitlement');
    }

    const featureSet = new Set<string>();
    for (const f of plan.features) {
      if (typeof f === 'string') {
        featureSet.add(f);
      } else if (f && typeof f === 'object') {
        const item = f as { code?: string; included?: boolean };
        if (item.included !== false && item.code) {
          featureSet.add(item.code);
        }
      }
    }

    const expanded = expandFeatureBundles(featureSet);
    if (!expanded.includes(FEATURE_CODES.PASSWORD_MANAGER)) {
      throw new ForbiddenError('Subscription plan does not include Password Manager entitlement');
    }
  }
}

export const equipmentService = new EquipmentService();

