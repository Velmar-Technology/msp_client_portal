import type { Request, Response } from 'express';
import {
  TenantSettingsService,
  tenantSettingsService,
} from '../services/TenantSettingsService';
import { ValidationError, NotFoundError } from '@shared/errors';

/**
 * Controller exposing RESTful HTTP endpoints for tenant configuration parameters (ADR-019).
 *
 * @see ADR-018
 * @see ADR-019
 */
export class SettingsController {
  constructor(
    private readonly service: TenantSettingsService = tenantSettingsService
  ) {}

  /**
   * GET /api/v1/base/settings — Retrieves all settings for the authenticated tenant.
   */
  async getSettings(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ValidationError('Tenant context missing from authentication session');
    }

    const module = req.query.module as string | undefined;
    const settings = await this.service.getAll(tenantId, module);

    res.json({
      success: true,
      data: settings,
    });
  }

  /**
   * GET /api/v1/base/settings/:key — Retrieves a specific setting by key.
   */
  async getSettingByKey(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ValidationError('Tenant context missing from authentication session');
    }

    const key = req.params.key;
    const value = await this.service.get(tenantId, key);

    if (value === undefined) {
      throw new NotFoundError(`Setting parameter '${key}' not found for tenant`);
    }

    res.json({
      success: true,
      data: { key, value },
    });
  }

  /**
   * PUT /api/v1/base/settings/:key — Sets or updates a specific setting.
   */
  async updateSetting(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ValidationError('Tenant context missing from authentication session');
    }

    const key = req.params.key;
    const { value, module } = req.body;

    const persisted = await this.service.set(tenantId, key, value, module);

    res.json({
      success: true,
      data: persisted,
    });
  }

  /**
   * DELETE /api/v1/base/settings/:key — Deletes a specific setting.
   */
  async deleteSetting(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ValidationError('Tenant context missing from authentication session');
    }

    const key = req.params.key;
    const deleted = await this.service.delete(tenantId, key);

    res.json({
      success: true,
      data: { key, deleted },
    });
  }
}

export const settingsController = new SettingsController();
