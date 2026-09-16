import { describe, it, expect } from 'vitest';
import {
  ByokProviderSchema,
  TenantByokConfigInputSchema,
  TenantByokStatusSchema,
  TestByokConnectionInputSchema,
  TestByokConnectionResponseSchema,
} from './byok.contract';

describe('BYOK Contract Validation Suite', () => {
  it('validates supported provider enums', () => {
    expect(ByokProviderSchema.safeParse('openai').success).toBe(true);
    expect(ByokProviderSchema.safeParse('anthropic').success).toBe(true);
    expect(ByokProviderSchema.safeParse('custom').success).toBe(true);
    expect(ByokProviderSchema.safeParse('invalid_provider').success).toBe(false);
  });

  it('validates TenantByokConfigInputSchema valid inputs and defaults', () => {
    const valid = {
      apiKey: 'sk-proj-1234567890abcdef',
      model: 'gpt-4o',
    };
    const result = TenantByokConfigInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('openai');
      expect(result.data.apiKey).toBe('sk-proj-1234567890abcdef');
    }
  });

  it('allows optional API key when updating configuration', () => {
    const validWithoutKey = {
      provider: 'openai',
      model: 'gpt-6-astra',
    };
    const result = TenantByokConfigInputSchema.safeParse(validWithoutKey);
    expect(result.success).toBe(true);
  });

  it('validates TenantByokStatusSchema with masked keys and UUIDs', () => {
    const status = {
      tenantId: '11111111-2222-3333-4444-555555555555',
      provider: 'anthropic' as const,
      model: 'claude-3-5-sonnet-20241022',
      isConfigured: true,
      keyMasked: 'sk-ant...4a2b',
      isValid: true,
      lastTestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const result = TenantByokStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it('validates TestByokConnectionResponseSchema', () => {
    const response = {
      success: true,
      latencyMs: 342,
      message: 'Connection verified successfully',
      modelsAvailable: ['gpt-4o', 'gpt-4o-mini'],
    };
    const result = TestByokConnectionResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
