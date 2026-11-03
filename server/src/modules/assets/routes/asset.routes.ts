import { Router } from 'express';
import { assetController } from '../controllers/AssetController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { requirePermission } from '@shared/middleware/requirePermission';
import { requireSubscriptionFeature } from '@shared/middleware/requireSubscriptionFeature';
import { validate } from '@shared/middleware/validationMiddleware';
import {
  CreateAssetInputSchema,
  UpdateAssetInputSchema,
  AssetParamsSchema,
  AssetFilterQuerySchema,
} from '@shared/contracts';
import { FEATURE_CODES } from '@shared/types';

const router = Router();

// Tenant authentication & subscription feature gating (BL-204)
router.use(authMiddleware);
router.use(requireSubscriptionFeature(FEATURE_CODES.ASSET_LIFECYCLE));

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
