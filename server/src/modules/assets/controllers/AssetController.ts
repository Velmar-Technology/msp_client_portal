import { Request, Response } from 'express';
import { AssetService, assetService } from '../services/AssetService';
import {
  CreateAssetInput,
  UpdateAssetInput,
  AssetFilterQuery,
} from '@shared/contracts';

/**
 * Controller translating HTTP requests to Asset domain service calls.
 * Implements Express 5 native async error propagation.
 */
export class AssetController {
  /**
   * Initializes AssetController with injected service.
   *
   * @param service - Asset business logic service
   */
  constructor(private readonly service: AssetService = assetService) {}

  /**
   * GET /api/v1/assets — Lists assets for caller's tenant.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async listAssets(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const filters: AssetFilterQuery = {
      search: req.query.search as string | undefined,
      type: req.query.type as any,
      status: req.query.status as any,
      assignedClientId: req.query.assignedClientId as string | undefined,
    };

    const data = await this.service.listAssets(tenantId, filters);
    res.json({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/assets/:id — Retrieves details of a specific asset.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async getAsset(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;

    const data = await this.service.getAsset(tenantId, id);
    res.json({
      success: true,
      data,
    });
  }

  /**
   * POST /api/v1/assets — Creates a new asset record.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async createAsset(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const input = req.body as CreateAssetInput;

    const data = await this.service.createAsset(tenantId, input);
    res.status(201).json({
      success: true,
      data,
    });
  }

  /**
   * PATCH /api/v1/assets/:id — Updates an asset.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async updateAsset(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const input = req.body as UpdateAssetInput;

    const data = await this.service.updateAsset(tenantId, id, input);
    res.json({
      success: true,
      data,
    });
  }

  /**
   * DELETE /api/v1/assets/:id — Soft-deletes an asset.
   *
   * @param req - Express request
   * @param res - Express response
   */
  async deleteAsset(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;

    const data = await this.service.deleteAsset(tenantId, id);
    res.json({
      success: true,
      data,
    });
  }
}

export const assetController = new AssetController();
