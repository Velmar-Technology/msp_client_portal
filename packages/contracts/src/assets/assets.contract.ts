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


/**
 * Alert states for consumable low-stock boundary deduplication
 */
export const ConsumableAlertStateSchema = z.enum([
  'NORMAL',
  'LOW_STOCK_NOTIFIED',
  'OUT_OF_STOCK_NOTIFIED',
]);
export type ConsumableAlertState = z.infer<typeof ConsumableAlertStateSchema>;

/**
 * Input schema for creating a new consumable
 */
export const CreateConsumableInputSchema = z.object({
  name: z.string().trim().min(1, 'Consumable name is required').max(255),
  category: z.string().trim().min(1, 'Category is required').max(100),
  modelNumber: z.string().trim().max(100).optional().nullable(),
  itemNumber: z.string().trim().max(100).optional().nullable(),
  manufacturer: z.string().trim().max(100).optional().nullable(),
  totalQuantity: z.number().int().min(0, 'Quantity must be non-negative').default(0),
  minQuantity: z.number().int().min(0, 'Minimum alert threshold must be non-negative').default(5),
  location: z.string().trim().max(255).optional().nullable(),
  purchaseCost: z.number().min(0).optional().nullable(),
});
export type CreateConsumableInput = z.infer<typeof CreateConsumableInputSchema>;

/**
 * Input schema for updating a consumable
 */
export const UpdateConsumableInputSchema = CreateConsumableInputSchema.partial();
export type UpdateConsumableInput = z.infer<typeof UpdateConsumableInputSchema>;

/**
 * Input schema for checking out / dispensing consumable stock
 */
export const CheckoutConsumableInputSchema = z.object({
  quantity: z.number().int().min(1, 'Must check out at least 1 unit'),
  assignedUserId: z.string().uuid('Invalid user ID').optional().nullable(),
  assignedEquipmentId: z.string().uuid('Invalid equipment ID').optional().nullable(),
  ticketId: z.string().uuid('Invalid ticket ID').optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type CheckoutConsumableInput = z.infer<typeof CheckoutConsumableInputSchema>;

/**
 * Input schema for restocking consumable inventory
 */
export const RestockConsumableInputSchema = z.object({
  quantity: z.number().int().min(1, 'Must restock at least 1 unit'),
  orderNumber: z.string().trim().max(100).optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type RestockConsumableInput = z.infer<typeof RestockConsumableInputSchema>;

/**
 * Complete consumable entity schema matching database representation and API response
 */
export const ConsumableSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  modelNumber: z.string().nullable().optional(),
  itemNumber: z.string().nullable().optional(),
  manufacturer: z.string().nullable().optional(),
  totalQuantity: z.number().int(),
  minQuantity: z.number().int(),
  location: z.string().nullable().optional(),
  purchaseCost: z.number().nullable().optional(),
  alertState: ConsumableAlertStateSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type ConsumableContract = z.infer<typeof ConsumableSchema>;

/**
 * Consumable checkout ledger entry schema
 */
export const ConsumableCheckoutSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  consumableId: z.string().uuid(),
  quantity: z.number().int(),
  assignedUserId: z.string().nullable().optional(),
  assignedUserName: z.string().nullable().optional(),
  assignedEquipmentId: z.string().nullable().optional(),
  assignedEquipmentName: z.string().nullable().optional(),
  ticketId: z.string().nullable().optional(),
  dispensedById: z.string().uuid(),
  dispensedByName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type ConsumableCheckoutContract = z.infer<typeof ConsumableCheckoutSchema>;

/**
 * Summary list response for consumables
 */
export const ConsumableListResponseSchema = z.object({
  consumables: z.array(ConsumableSchema),
  total: z.number().int().min(0),
  lowStockCount: z.number().int().min(0),
  outOfStockCount: z.number().int().min(0),
});
export type ConsumableListResponse = z.infer<typeof ConsumableListResponseSchema>;
