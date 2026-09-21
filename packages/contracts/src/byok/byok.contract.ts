import { z } from 'zod';

/**
 * Supported AI Providers for Educational & IT Automation Agents.
 */
export const ByokProviderSchema = z.enum(['openai', 'anthropic', 'custom', 'gemini']);
export type ByokProvider = z.infer<typeof ByokProviderSchema>;

/**
 * Input schema for saving or updating a tenant's private credentials.
 */
export const TenantByokConfigInputSchema = z.object({
  provider: ByokProviderSchema.default('openai'),
  apiKey: z
    .string()
    .trim()
    .max(512, 'API key cannot exceed 512 characters')
    .optional()
    .or(z.literal('')),
  model: z.string().max(128).optional(),
  baseUrl: z.string().url().max(255).optional().or(z.literal('')),
});
export type TenantByokConfigInput = z.infer<typeof TenantByokConfigInputSchema>;

/**
 * Publicly inspectable sanitized status for a tenant.
 * Does not leak the plaintext API key.
 */
export const TenantByokStatusSchema = z.object({
  tenantId: z.string().uuid(),
  provider: ByokProviderSchema,
  model: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  isConfigured: z.boolean(),
  keyMasked: z.string(),
  isValid: z.boolean().optional(),
  lastTestedAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});
export type TenantByokStatus = z.infer<typeof TenantByokStatusSchema>;

/**
 * Input schema for testing provider credentials and quota.
 */
export const TestByokConnectionInputSchema = z.object({
  provider: ByokProviderSchema.default('openai'),
  apiKey: z
    .string()
    .trim()
    .max(512, 'API key cannot exceed 512 characters')
    .optional()
    .or(z.literal('')),
  model: z.string().max(128).optional(),
  baseUrl: z.string().url().max(255).optional().or(z.literal('')),
});
export type TestByokConnectionInput = z.infer<typeof TestByokConnectionInputSchema>;

/**
 * Output schema for BYOK connection verification test.
 */
export const TestByokConnectionResponseSchema = z.object({
  success: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  message: z.string(),
  modelsAvailable: z.array(z.string()).optional(),
});
export type TestByokConnectionResponse = z.infer<typeof TestByokConnectionResponseSchema>;
