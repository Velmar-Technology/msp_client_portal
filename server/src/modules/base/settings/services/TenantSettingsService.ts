import { BaseService } from '@modules/base/shared/services/BaseService';
import {
  TenantSettingsRepository,
  tenantSettingsRepository,
} from '../repositories/TenantSettingsRepository';
import { type TenantSettingRow } from '../settings.schema';
import { domainEventBus } from '@modules/base/shared/events/DomainEventBus';
import { ValidationError } from '@shared/errors';

/**
 * Service orchestrating tenant key-value configuration parameters (ADR-019).
 * Provides typed parameter retrieval, fallback defaults, and event dispatching.
 *
 * @see ADR-018
 * @see ADR-019
 */
export class TenantSettingsService extends BaseService {
  constructor(
    private readonly repository: TenantSettingsRepository = tenantSettingsRepository
  ) {
    super();
  }

  /**
   * Retrieves a typed configuration setting with fallback default.
   *
   * @typeParam T - Expected value type
   * @param tenantId - Tenant UUID
   * @param key - Setting key identifier
   * @param defaultValue - Fallback value if setting is not configured
   * @returns Configured value cast to T or defaultValue
   */
  async get<T = unknown>(tenantId: string, key: string, defaultValue?: T): Promise<T> {
    if (!tenantId || !key) {
      return defaultValue as T;
    }

    const row = await this.repository.findByKey(tenantId, key);
    if (!row || row.value === undefined || row.value === null) {
      return defaultValue as T;
    }

    return row.value as T;
  }

  /**
   * Persists a configuration parameter and notifies the system via DomainEventBus.
   *
   * @param tenantId - Tenant UUID
   * @param key - Setting key identifier
   * @param value - Value to store (must be JSON-serializable)
   * @param module - Module identifier (defaults to 'core')
   * @returns Persisted setting row
   * @throws {ValidationError} If key or value is invalid
   */
  async set(
    tenantId: string,
    key: string,
    value: unknown,
    module = 'core'
  ): Promise<TenantSettingRow> {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required to set configuration parameter');
    }
    if (!key || typeof key !== 'string' || !key.trim()) {
      throw new ValidationError('Valid setting key string is required');
    }
    if (value === undefined) {
      throw new ValidationError('Setting value cannot be undefined');
    }

    const trimmedKey = key.trim();
    const persisted = await this.repository.upsert(tenantId, trimmedKey, value, module);

    // Dispatches domain event for decoupled listeners
    domainEventBus.emit('settings:updated', {
      tenantId,
      key: trimmedKey,
      value,
      module,
    });

    return persisted;
  }

  /**
   * Retrieves a flat key-value dictionary of all settings for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @param module - Optional module filter
   * @returns Record of key -> value pairs
   */
  async getAll(tenantId: string, module?: string): Promise<Record<string, unknown>> {
    if (!tenantId) {
      return {};
    }

    const rows = await this.repository.findAllByModule(tenantId, module);
    const dict: Record<string, unknown> = {};
    for (const r of rows) {
      dict[r.key] = r.value;
    }
    return dict;
  }

  /**
   * Deletes a configuration setting by key.
   *
   * @param tenantId - Tenant UUID
   * @param key - Setting key identifier
   * @returns True if deleted, false otherwise
   */
  async delete(tenantId: string, key: string): Promise<boolean> {
    if (!tenantId || !key) {
      return false;
    }
    return this.repository.deleteByKey(tenantId, key);
  }
}

export const tenantSettingsService = new TenantSettingsService();
