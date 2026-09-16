import crypto from 'crypto';
import { db, tenantByokCredentials } from '@shared/db';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/utils/logger';
import { ValidationError, InternalServerError } from '@shared/errors';
import type {
  TenantByokConfigInput,
  TenantByokStatus,
  TestByokConnectionInput,
  TestByokConnectionResponse,
} from '@shared/contracts';

export interface DecryptedTenantByok {
  tenantId: string;
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model?: string | null;
  baseUrl?: string | null;
}

/**
 * Domain Service managing Tenant BYOK AI Credentials, AES-256-GCM encryption at rest,
 * and live connectivity validation under Dominican Law 172-13 and MSP Zero-Liability principles.
 */
export class TenantByokService {
  /**
   * Derives a deterministic 32-byte key for AES-256-GCM.
   */
  private getEncryptionKey(): Buffer {
    const rawSecret =
      process.env.BYOK_ENCRYPTION_KEY ||
      process.env.ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'velmar-byok-default-encryption-secret-32-chars!!';
    return crypto.createHash('sha256').update(rawSecret).digest();
  }

  /**
   * Encrypts plaintext string using AES-256-GCM.
   *
   * @param plainText - The sensitive key to encrypt
   * @returns Ciphertext, hex IV, and hex authentication tag
   */
  public encrypt(plainText: string): {
    encryptedApiKey: string;
    keyIv: string;
    keyAuthTag: string;
  } {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return {
      encryptedApiKey: encrypted,
      keyIv: iv.toString('hex'),
      keyAuthTag: authTag,
    };
  }

  /**
   * Decrypts AES-256-GCM ciphertext, verifying cryptographic integrity via the auth tag.
   *
   * @param encryptedApiKey - Hex ciphertext
   * @param keyIv - Hex IV
   * @param keyAuthTag - Hex authentication tag
   * @returns Decrypted plaintext string
   */
  public decrypt(
    encryptedApiKey: string,
    keyIv: string,
    keyAuthTag: string
  ): string {
    const key = this.getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(keyIv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(keyAuthTag, 'hex'));
    let decrypted = decipher.update(encryptedApiKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generates a safe masked representation of the API key for UI display.
   *
   * @param apiKey - Plaintext API key
   * @returns Masked string e.g. sk-pr...4a2b
   */
  public maskKey(apiKey: string): string {
    const trimmed = apiKey.trim();
    if (trimmed.length <= 8) return '****';
    return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
  }

  /**
   * Persists or updates encrypted BYOK credentials for a tenant.
   *
   * @param tenantId - Target tenant UUID
   * @param input - Provider, API key, model and baseUrl configuration
   * @returns Sanitized TenantByokStatus safe for client response
   */
  public async upsertTenantByok(
    tenantId: string,
    input: TenantByokConfigInput
  ): Promise<TenantByokStatus> {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required for BYOK credential registration');
    }

    const existing = await db
      .select()
      .from(tenantByokCredentials)
      .where(eq(tenantByokCredentials.tenant_id, tenantId))
      .limit(1);

    const existingRow = existing && existing.length > 0 ? existing[0] : null;
    const trimmedKey = input.apiKey?.trim();

    if (!trimmedKey && !existingRow) {
      throw new ValidationError('API key is required for initial BYOK credential registration');
    }

    let encryptedApiKey = existingRow?.encrypted_api_key ?? '';
    let keyIv = existingRow?.key_iv ?? '';
    let keyAuthTag = existingRow?.key_auth_tag ?? '';
    let keyMasked = existingRow?.key_masked ?? '';

    if (trimmedKey) {
      const encrypted = this.encrypt(trimmedKey);
      encryptedApiKey = encrypted.encryptedApiKey;
      keyIv = encrypted.keyIv;
      keyAuthTag = encrypted.keyAuthTag;
      keyMasked = this.maskKey(trimmedKey);
    }

    await db
      .insert(tenantByokCredentials)
      .values({
        tenant_id: tenantId,
        provider: input.provider,
        model: input.model || null,
        base_url: input.baseUrl || null,
        encrypted_api_key: encryptedApiKey,
        key_iv: keyIv,
        key_auth_tag: keyAuthTag,
        key_masked: keyMasked,
        is_valid: true,
        last_tested_at: new Date(),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: tenantByokCredentials.tenant_id,
        set: {
          provider: input.provider,
          model: input.model || null,
          base_url: input.baseUrl || null,
          encrypted_api_key: encryptedApiKey,
          key_iv: keyIv,
          key_auth_tag: keyAuthTag,
          key_masked: keyMasked,
          is_valid: true,
          last_tested_at: new Date(),
          updated_at: new Date(),
        },
      });

    return this.getTenantByokStatus(tenantId);
  }

  /**
   * Retrieves sanitized BYOK status for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Sanitized status without plaintext secrets
   */
  public async getTenantByokStatus(tenantId: string): Promise<TenantByokStatus> {
    const rows = await db
      .select()
      .from(tenantByokCredentials)
      .where(eq(tenantByokCredentials.tenant_id, tenantId))
      .limit(1);

    if (!rows || rows.length === 0) {
      return {
        tenantId,
        provider: 'openai',
        isConfigured: false,
        keyMasked: 'NONE',
        isValid: false,
      };
    }

    const row = rows[0];
    return {
      tenantId: row.tenant_id,
      provider: row.provider as 'openai' | 'anthropic' | 'custom',
      model: row.model,
      baseUrl: row.base_url,
      isConfigured: true,
      keyMasked: row.key_masked,
      isValid: row.is_valid,
      lastTestedAt: row.last_tested_at ? row.last_tested_at.toISOString() : null,
      updatedAt: row.updated_at ? row.updated_at.toISOString() : null,
    };
  }

  /**
   * Retrieves decrypted credentials for internal processing (MCP server proxy or CAF quality agent).
   *
   * @param tenantId - Tenant UUID
   * @returns Decrypted credentials or null if not found
   */
  public async getDecryptedKeyForTenant(
    tenantId: string
  ): Promise<DecryptedTenantByok | null> {
    const rows = await db
      .select()
      .from(tenantByokCredentials)
      .where(eq(tenantByokCredentials.tenant_id, tenantId))
      .limit(1);

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    try {
      const apiKey = this.decrypt(
        row.encrypted_api_key,
        row.key_iv,
        row.key_auth_tag
      );
      return {
        tenantId: row.tenant_id,
        provider: row.provider as 'openai' | 'anthropic' | 'custom',
        apiKey,
        model: row.model,
        baseUrl: row.base_url,
      };
    } catch (err: any) {
      logger.error(`[TenantByokService] Decryption failed for tenant ${tenantId}: ${err?.message}`);
      throw new InternalServerError(
        'Failed to decrypt tenant BYOK credentials. Key or authentication tag corrupted.'
      );
    }
  }

  /**
   * Tests BYOK provider credentials live in-memory without logging or persisting plain secrets.
   *
   * @param input - Provider, candidate API key, and optional model / baseUrl
   * @returns Validation response with latency and status message
   */
  public async testConnection(
    input: TestByokConnectionInput
  ): Promise<TestByokConnectionResponse> {
    const startTime = Date.now();
    const { provider, apiKey, baseUrl } = input;

    try {
      if (provider === 'openai') {
        const url = baseUrl
          ? `${baseUrl.replace(/\/+$/, '')}/models`
          : 'https://api.openai.com/v1/models';
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(8000),
        });

        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json().catch(() => ({}));
          const modelsAvailable = Array.isArray(data?.data)
            ? data.data.map((m: any) => m.id).slice(0, 5)
            : undefined;
          return {
            success: true,
            latencyMs,
            message: 'OpenAI API key validated successfully',
            modelsAvailable,
          };
        }

        const errData: any = await res.json().catch(() => ({}));
        const errMsg =
          errData?.error?.message || `OpenAI returned status ${res.status}`;
        return {
          success: false,
          latencyMs,
          message: errMsg,
        };
      }

      if (provider === 'anthropic') {
        const url = baseUrl
          ? `${baseUrl.replace(/\/+$/, '')}/models`
          : 'https://api.anthropic.com/v1/models';
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          signal: AbortSignal.timeout(8000),
        });

        const latencyMs = Date.now() - startTime;
        if (res.ok) {
          const data: any = await res.json().catch(() => ({}));
          const modelsAvailable = Array.isArray(data?.data)
            ? data.data.map((m: any) => m.id).slice(0, 5)
            : undefined;
          return {
            success: true,
            latencyMs,
            message: 'Anthropic API key validated successfully',
            modelsAvailable,
          };
        }

        const errData: any = await res.json().catch(() => ({}));
        const errMsg =
          errData?.error?.message || `Anthropic returned status ${res.status}`;
        return {
          success: false,
          latencyMs,
          message: errMsg,
        };
      }

      if (provider === 'custom') {
        if (!baseUrl) {
          return {
            success: false,
            latencyMs: Date.now() - startTime,
            message: 'Base URL is required for custom AI provider endpoints',
          };
        }
        const pingUrl = `${baseUrl.replace(/\/+$/, '')}/models`;
        const res = await fetch(pingUrl, {
          method: 'GET',
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - startTime;
        return {
          success: res.ok,
          latencyMs,
          message: res.ok
            ? 'Custom endpoint validated successfully'
            : `Custom endpoint returned status ${res.status}`,
        };
      }

      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Unsupported provider: ${provider}`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err?.message || 'Network error reaching LLM provider endpoint',
      };
    }
  }
}
