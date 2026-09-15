import { ByokProvider, type ByokLlmConfig } from './ByokLlmClient.js';
import { CafPrivacyFilter } from '../caf/CafPrivacyFilter.js';

/**
 * Tenant-specific BYOK credentials and preferences.
 */
export interface TenantByokProfile {
  tenantId: string;
  institutionName?: string;
  provider: ByokProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sanitized profile information safe for public or client-side inspection.
 */
export interface TenantByokStatus {
  tenantId: string;
  institutionName?: string;
  provider: ByokProvider;
  model?: string;
  isConfigured: boolean;
  keyMasked: string;
  hasIsolatedPrivacyFilter: boolean;
  updatedAt?: string;
}

/**
 * Multi-Tenant BYOK and Privacy Isolation Manager.
 *
 * Enforces strict tenant boundaries:
 * 1. Isolates BYOK API keys so each educational institution funds their own token usage.
 * 2. Maintains isolated in-memory CafPrivacyFilter instances per tenant, preventing PII
 *    mapping cross-contamination between different schools under Dominican Law 172-13.
 */
export class TenantByokManager {
  private static instance: TenantByokManager;

  /**
   * Tenant ID -> BYOK Profile
   */
  private readonly tenantProfiles = new Map<string, TenantByokProfile>();

  /**
   * Tenant ID -> Dedicated CafPrivacyFilter
   */
  private readonly tenantPrivacyFilters = new Map<string, CafPrivacyFilter>();

  private constructor() {}

  /**
   * Retrieves the global singleton instance.
   */
  public static getInstance(): TenantByokManager {
    if (!TenantByokManager.instance) {
      TenantByokManager.instance = new TenantByokManager();
    }
    return TenantByokManager.instance;
  }

  /**
   * Registers or updates a tenant's private BYOK credentials.
   *
   * @param profile - Tenant ID and LLM configuration
   */
  public setTenantProfile(profile: {
    tenantId: string;
    institutionName?: string;
    provider: ByokProvider;
    apiKey: string;
    model?: string;
    baseUrl?: string;
  }): void {
    const existing = this.tenantProfiles.get(profile.tenantId);
    const now = new Date().toISOString();

    this.tenantProfiles.set(profile.tenantId, {
      tenantId: profile.tenantId,
      institutionName: profile.institutionName || existing?.institutionName,
      provider: profile.provider,
      apiKey: profile.apiKey.trim(),
      model: profile.model || existing?.model,
      baseUrl: profile.baseUrl || existing?.baseUrl,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
  }

  /**
   * Retrieves a tenant's raw BYOK profile.
   *
   * @param tenantId - The UUID or ID of the tenant
   */
  public getTenantProfile(tenantId: string): TenantByokProfile | undefined {
    return this.tenantProfiles.get(tenantId);
  }

  /**
   * Checks whether a tenant has a configured BYOK key.
   */
  public hasTenantProfile(tenantId: string): boolean {
    return this.tenantProfiles.has(tenantId);
  }

  /**
   * Deletes a tenant's configuration and purges their isolated privacy cache.
   */
  public removeTenantProfile(tenantId: string): boolean {
    this.tenantPrivacyFilters.delete(tenantId);
    return this.tenantProfiles.delete(tenantId);
  }

  /**
   * Retrieves or instantiates an isolated CafPrivacyFilter for the tenant.
   * Ensures that PII tokens ([ESTUDIANTE_01], [CEDULA_01]) from School A are
   * completely isolated from School B.
   *
   * @param tenantId - Tenant UUID
   */
  public getTenantPrivacyFilter(tenantId: string): CafPrivacyFilter {
    let filter = this.tenantPrivacyFilters.get(tenantId);
    if (!filter) {
      filter = new CafPrivacyFilter();
      this.tenantPrivacyFilters.set(tenantId, filter);
    }
    return filter;
  }

  /**
   * Resolves effective LLM configuration for a request, falling back to:
   * 1. Per-request overrides
   * 2. Tenant profile registered in this manager
   * 3. Environment variable defaults
   */
  public resolveConfig(
    tenantId?: string,
    overrides?: Partial<ByokLlmConfig>
  ): ByokLlmConfig {
    const tenantProfile = tenantId ? this.tenantProfiles.get(tenantId) : undefined;

    const provider: ByokProvider =
      overrides?.provider ||
      tenantProfile?.provider ||
      'openai';

    const apiKey =
      overrides?.apiKey ||
      tenantProfile?.apiKey ||
      (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY) ||
      process.env.BYOK_DEFAULT_API_KEY;

    const model =
      overrides?.model ||
      tenantProfile?.model;

    const baseUrl =
      overrides?.baseUrl ||
      tenantProfile?.baseUrl;

    return {
      provider,
      apiKey,
      model,
      baseUrl,
    };
  }

  /**
   * Returns a sanitized status list of all registered tenants.
   */
  public getTenantStatuses(): TenantByokStatus[] {
    const statuses: TenantByokStatus[] = [];
    for (const [tenantId, profile] of this.tenantProfiles.entries()) {
      const keyLen = profile.apiKey.length;
      const keyMasked =
        keyLen > 8
          ? `${profile.apiKey.slice(0, 4)}...${profile.apiKey.slice(-4)}`
          : '****';

      statuses.push({
        tenantId,
        institutionName: profile.institutionName,
        provider: profile.provider,
        model: profile.model,
        isConfigured: true,
        keyMasked,
        hasIsolatedPrivacyFilter: this.tenantPrivacyFilters.has(tenantId),
        updatedAt: profile.updatedAt,
      });
    }
    return statuses;
  }

  /**
   * Returns a sanitized status for a single tenant.
   */
  public getTenantStatus(tenantId: string): TenantByokStatus {
    const profile = this.tenantProfiles.get(tenantId);
    if (!profile) {
      return {
        tenantId,
        provider: 'openai',
        isConfigured: false,
        keyMasked: 'NONE',
        hasIsolatedPrivacyFilter: this.tenantPrivacyFilters.has(tenantId),
      };
    }

    const keyLen = profile.apiKey.length;
    const keyMasked =
      keyLen > 8
        ? `${profile.apiKey.slice(0, 4)}...${profile.apiKey.slice(-4)}`
        : '****';

    return {
      tenantId,
      institutionName: profile.institutionName,
      provider: profile.provider,
      model: profile.model,
      isConfigured: true,
      keyMasked,
      hasIsolatedPrivacyFilter: this.tenantPrivacyFilters.has(tenantId),
      updatedAt: profile.updatedAt,
    };
  }
}
