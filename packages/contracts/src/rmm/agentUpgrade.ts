import { z } from 'zod';

/**
 * Request body/params schema for triggering an agent self-upgrade.
 */
export const AgentUpgradeRequestSchema = z.object({
  equipmentId: z.string().uuid('Invalid equipment ID'),
  targetVersion: z
    .string()
    .trim()
    .regex(/^v?\d+\.\d+\.\d+$/, 'Target version must follow semver format (e.g. 1.10.2 or v1.10.2)')
    .optional(),
  installerType: z.enum(['msi', 'binary']).optional().default('msi'),
  downloadUrl: z.string().url('Invalid download URL').optional(),
  sha256Checksum: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Checksum must be a 64-character hexadecimal SHA-256 string')
    .optional(),
  rollbackTimeoutSecs: z
    .number()
    .int()
    .min(10, 'Rollback timeout must be at least 10 seconds')
    .max(300, 'Rollback timeout cannot exceed 300 seconds')
    .optional()
    .default(45),
});

export type AgentUpgradeRequest = z.infer<typeof AgentUpgradeRequestSchema>;

/**
 * WebSocket payload dispatched from AgentGateway to the remote msp-agent.
 */
export const AgentUpgradePayloadSchema = z.object({
  target_version: z.string(),
  installer_type: z.enum(['msi', 'binary']).optional().default('msi'),
  download_url: z.string().url(),
  sha256_checksum: z.string().regex(/^[a-fA-F0-9]{64}$/),
  rollback_timeout_secs: z.number().int().min(10).max(300).default(45),
});

export type AgentUpgradePayload = z.infer<typeof AgentUpgradePayloadSchema>;

/**
 * API response schema returned to the caller upon initiating an upgrade.
 */
export const AgentUpgradeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  equipmentId: z.string().uuid(),
  targetVersion: z.string(),
  rollbackTimeoutSecs: z.number(),
  initiatedAt: z.string(),
});

export type AgentUpgradeResponse = z.infer<typeof AgentUpgradeResponseSchema>;
