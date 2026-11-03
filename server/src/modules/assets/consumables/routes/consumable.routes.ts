import { Router } from 'express';
import { consumableController } from '../controllers/ConsumableController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { requirePermission } from '@shared/middleware/requirePermission';
import { requireSubscriptionFeature } from '@shared/middleware/requireSubscriptionFeature';
import { validate } from '@shared/middleware/validationMiddleware';
import {
  AssetParamsSchema,
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

// GET /api/v1/assets/consumables — List consumables
router.get(
  '/',
  requirePermission(['assets:consumables:read', 'assets:read']),
  (req, res) => consumableController.listConsumables(req, res)
);

// GET /api/v1/assets/consumables/:id — Get consumable
router.get(
  '/:id',
  requirePermission(['assets:consumables:read', 'assets:read']),
  validate(AssetParamsSchema, 'params'),
  (req, res) => consumableController.getConsumable(req, res)
);

// POST /api/v1/assets/consumables — Create consumable
router.post(
  '/',
  requirePermission(['assets:consumables:manage', 'assets:manage']),
  validate(CreateConsumableInputSchema, 'body'),
  (req, res) => consumableController.createConsumable(req, res)
);

// PATCH /api/v1/assets/consumables/:id — Update consumable
router.patch(
  '/:id',
  requirePermission(['assets:consumables:manage', 'assets:manage']),
  validate(AssetParamsSchema, 'params'),
  validate(UpdateConsumableInputSchema, 'body'),
  (req, res) => consumableController.updateConsumable(req, res)
);

// DELETE /api/v1/assets/consumables/:id — Soft-delete consumable
router.delete(
  '/:id',
  requirePermission(['assets:consumables:manage', 'assets:manage']),
  validate(AssetParamsSchema, 'params'),
  (req, res) => consumableController.deleteConsumable(req, res)
);

// POST /api/v1/assets/consumables/:id/checkout — Dispense/checkout stock
router.post(
  '/:id/checkout',
  requirePermission(['assets:consumables:update', 'assets:manage']),
  validate(AssetParamsSchema, 'params'),
  validate(CheckoutConsumableInputSchema, 'body'),
  (req, res) => consumableController.checkout(req, res)
);

// POST /api/v1/assets/consumables/:id/restock — Restock inventory
router.post(
  '/:id/restock',
  requirePermission(['assets:consumables:update', 'assets:manage']),
  validate(AssetParamsSchema, 'params'),
  validate(RestockConsumableInputSchema, 'body'),
  (req, res) => consumableController.restock(req, res)
);

// GET /api/v1/assets/consumables/:id/checkouts — Get checkout ledger history
router.get(
  '/:id/checkouts',
  requirePermission(['assets:consumables:read', 'assets:read']),
  validate(AssetParamsSchema, 'params'),
  (req, res) => consumableController.getCheckouts(req, res)
);

export default router;
