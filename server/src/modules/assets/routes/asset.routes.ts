import { Router } from 'express';
import { assetController } from '../controllers/AssetController';
import { consumableController } from '../controllers/ConsumableController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { requirePermission } from '@shared/middleware/requirePermission';
import { requireSubscriptionFeature } from '@shared/middleware/requireSubscriptionFeature';
import { validate } from '@shared/middleware/validationMiddleware';
import {
  CreateAssetInputSchema,
  UpdateAssetInputSchema,
  AssetParamsSchema,
  AssetFilterQuerySchema,
  CreateConsumableInputSchema,
  UpdateConsumableInputSchema,
  CheckoutConsumableInputSchema,
  RestockConsumableInputSchema,
} from '@shared/contracts';
import { FEATURE_CODES } from '@shared/types';

const router = Router();

// Tenant authentication & subscription feature gating (BL-204)
router.use(authMiddleware);
router.use(requireSubscriptionFeature(FEATURE_CODES.ASSET_LIFECYCLE));

// ---- Consumables Sub-Routes (Placed before /:id parameter routes) ----

// GET /api/v1/assets/consumables — List consumables
router.get(
  '/consumables',
  requirePermission('assets:read'),
  (req, res) => consumableController.listConsumables(req, res)
);

// GET /api/v1/assets/consumables/:id — Get consumable
router.get(
  '/consumables/:id',
  requirePermission('assets:read'),
  validate(AssetParamsSchema, 'params'),
  (req, res) => consumableController.getConsumable(req, res)
);

// POST /api/v1/assets/consumables — Create consumable
router.post(
  '/consumables',
  requirePermission('assets:manage'),
  validate(CreateConsumableInputSchema, 'body'),
  (req, res) => consumableController.createConsumable(req, res)
);

// PATCH /api/v1/assets/consumables/:id — Update consumable
router.patch(
  '/consumables/:id',
  requirePermission('assets:manage'),
  validate(AssetParamsSchema, 'params'),
  validate(UpdateConsumableInputSchema, 'body'),
  (req, res) => consumableController.updateConsumable(req, res)
);

// DELETE /api/v1/assets/consumables/:id — Soft-delete consumable
router.delete(
  '/consumables/:id',
  requirePermission('assets:manage'),
  validate(AssetParamsSchema, 'params'),
  (req, res) => consumableController.deleteConsumable(req, res)
);

// POST /api/v1/assets/consumables/:id/checkout — Dispense/checkout stock
router.post(
  '/consumables/:id/checkout',
  requirePermission('assets:manage'),
  validate(AssetParamsSchema, 'params'),
  validate(CheckoutConsumableInputSchema, 'body'),
  (req, res) => consumableController.checkout(req, res)
);

// POST /api/v1/assets/consumables/:id/restock — Restock inventory
router.post(
  '/consumables/:id/restock',
  requirePermission('assets:manage'),
  validate(AssetParamsSchema, 'params'),
  validate(RestockConsumableInputSchema, 'body'),
  (req, res) => consumableController.restock(req, res)
);

// GET /api/v1/assets/consumables/:id/checkouts — Get checkout ledger history
router.get(
  '/consumables/:id/checkouts',
  requirePermission('assets:read'),
  validate(AssetParamsSchema, 'params'),
  (req, res) => consumableController.getCheckouts(req, res)
);

// ---- Standard IT Asset Routes ----

// GET /api/v1/assets — List assets with search & filters
router.get(
  '/',
  requirePermission('assets:read'),
  validate(AssetFilterQuerySchema, 'query'),
  (req, res) => assetController.listAssets(req, res)
);

// GET /api/v1/assets/:id — Retrieve single asset
router.get(
  '/:id',
  requirePermission('assets:read'),
  validate(AssetParamsSchema, 'params'),
  (req, res) => assetController.getAsset(req, res)
);

// POST /api/v1/assets — Create asset
router.post(
  '/',
  requirePermission('assets:manage'),
  validate(CreateAssetInputSchema, 'body'),
  (req, res) => assetController.createAsset(req, res)
);

// PATCH /api/v1/assets/:id — Update asset
router.patch(
  '/:id',
  requirePermission('assets:manage'),
  validate(AssetParamsSchema, 'params'),
  validate(UpdateAssetInputSchema, 'body'),
  (req, res) => assetController.updateAsset(req, res)
);

// DELETE /api/v1/assets/:id — Soft-delete asset
router.delete(
  '/:id',
  requirePermission('assets:manage'),
  validate(AssetParamsSchema, 'params'),
  (req, res) => assetController.deleteAsset(req, res)
);

export default router;
