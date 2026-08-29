import { Request, Response } from 'express';
import { rmmPatchService, RmmPatchService } from '@modules/rmm/services/RmmPatchService';

/**
 * Controller handling HTTP requests for RMM device overview, patch listing, telemetry scanning, and patch deployment.
 */
export class RmmController {
  /**
   * Initializes RmmController with RmmPatchService dependency.
   *
   * @param rmmPatchSvc - RMM patch service
   */
  constructor(private rmmPatchSvc: RmmPatchService = rmmPatchService) {}

  /**
   * Helper extracting tenantId and administrator role flags from request.
   *
   * @param req - Express request
   * @returns Object with tenantId and byAdmin boolean
   */
  private getUserContext(req: Request) {
    const user = (req as any).user || {};
    const tenantId = user.tenantId || user.tenant_id;
    const byAdmin = user.role === 'ADMIN' || user.role === 'TECHNICIAN';
    return { tenantId, byAdmin };
  }

  /**
   * Handles querying high-level RMM metrics, online hosts, pending patches, and automation ratios.
   *
   * @param req - Express request
   * @param res - Express response returning RmmOverviewStats
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const overview = await this.rmmPatchSvc.getRmmOverview(tenantId, byAdmin);
    res.json({ success: true, data: overview });
  }

  /**
   * Handles listing available and installed patches for an equipment asset.
   *
   * @param req - Express request with equipmentId in params
   * @param res - Express response returning array of patches
   */
  async getEquipmentPatches(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const equipmentId = String(req.params.equipmentId);
    const patches = await this.rmmPatchSvc.getEquipmentPatches(equipmentId, tenantId, byAdmin);
    res.json({ success: true, data: patches });
  }

  /**
   * Handles triggering an on-demand Zabbix host telemetry sync and patch scan.
   *
   * @param req - Express request with equipmentId in params
   * @param res - Express response returning fresh telemetry snapshot
   */
  async triggerScan(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const equipmentId = String(req.params.equipmentId);
    const telemetry = await this.rmmPatchSvc.triggerPatchScan(equipmentId, tenantId, byAdmin);
    res.json({ success: true, data: telemetry });
  }

  /**
   * Handles initiating remote patch installation on the target host.
   *
   * @param req - Express request with equipmentId in params and patchIds array in body
   * @param res - Express response returning updated patches
   */
  async applyPatches(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const equipmentId = String(req.params.equipmentId);
    const { patchIds } = req.body;
    const applied = await this.rmmPatchSvc.applyPatches(equipmentId, patchIds || [], tenantId, byAdmin);
    res.json({ success: true, data: applied });
  }
}

export const rmmController = new RmmController();
