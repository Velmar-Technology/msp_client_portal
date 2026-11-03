import { z } from 'zod';

/**
 * Types of IT assets tracked across client infrastructure
 */
export const AssetTypeSchema = z.enum([
  'HARDWARE',
  'SOFTWARE',
  'NETWORK',
  'PERIPHERAL',
  'OTHER',
]);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Operational lifecycle statuses for an asset
 */
export const AssetStatusSchema = z.enum([
  'ACTIVE',
  'MAINTENANCE',
  'IN_STORAGE',
  'DECOMMISSIONED',
]);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

/**
 * Input schema for creating a new IT asset
 */
export const CreateAssetInputSchema = z.object({
  name: z.string().trim().min(1, 'Asset name is required').max(255),
  assetType: AssetTypeSchema.default('HARDWARE'),
  status: AssetStatusSchema.default('ACTIVE'),
  model: z.string().trim().max(255).optional().nullable(),
  serialNumber: z.string().trim().max(255).optional().nullable(),
  manufacturer: z.string().trim().max(255).optional().nullable(),
  assignedClientId: z.string().uuid('Invalid client ID').optional().nullable(),
  assignedEquipmentId: z.string().uuid('Invalid equipment ID').optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiresAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type CreateAssetInput = z.infer<typeof CreateAssetInputSchema>;

/**
 * Input schema for updating an existing IT asset
 */
export const UpdateAssetInputSchema = CreateAssetInputSchema.partial();
export type UpdateAssetInput = z.infer<typeof UpdateAssetInputSchema>;

/**
 * URL parameter schema for asset-scoped operations
 */
export const AssetParamsSchema = z.object({
  id: z.string().uuid('Invalid asset ID'),
});
export type AssetParams = z.infer<typeof AssetParamsSchema>;

/**
 * Query filter schema for listing assets
 */
export const AssetFilterQuerySchema = z.object({
  search: z.string().optional(),
  type: AssetTypeSchema.optional(),
  status: AssetStatusSchema.optional(),
  assignedClientId: z.string().uuid().optional(),
});
export type AssetFilterQuery = z.infer<typeof AssetFilterQuerySchema>;

/**
 * Complete IT Asset entity schema matching database representation and API response
 */
export const AssetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  assetType: AssetTypeSchema,
  status: AssetStatusSchema,
  model: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  assignedClientId: z.string().nullable().optional(),
  assignedClientName: z.string().nullable().optional(),
  assignedEquipmentId: z.string().nullable().optional(),
  assignedEquipmentName: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  warrantyExpiresAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type AssetContract = z.infer<typeof AssetSchema>;

/**
 * Paginated or summary asset list response schema
 */
export const AssetListResponseSchema = z.object({
  assets: z.array(AssetSchema),
  total: z.number().int().min(0),
  activeCount: z.number().int().min(0),
  maintenanceCount: z.number().int().min(0),
});
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>;

// Re-export hierarchical consumables contract (ADR-017)
export * from './consumables/consumables.contract';

