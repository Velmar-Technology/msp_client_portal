import { Request, Response } from 'express';
import { rmmPatchService, RmmPatchService } from '../services/RmmPatchService';

export class RmmController {
  constructor(private rmmPatchSvc: RmmPatchService = rmmPatchService) {}

  private getUserContext(req: Request) {
    const user = (req as any).user || {};
    const tenantId = user.tenantId || user.tenant_id;
    const byAdmin = user.role === 'ADMIN' || user.role === 'TECHNICIAN';
    return { tenantId, byAdmin };
  }

  async getOverview(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const overview = await this.rmmPatchSvc.getRmmOverview(tenantId, byAdmin);
    res.json({ success: true, data: overview });
  }

  async getEquipmentPatches(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const equipmentId = String(req.params.equipmentId);
    const patches = await this.rmmPatchSvc.getEquipmentPatches(equipmentId, tenantId, byAdmin);
    res.json({ success: true, data: patches });
  }

  async triggerScan(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const equipmentId = String(req.params.equipmentId);
    const telemetry = await this.rmmPatchSvc.triggerPatchScan(equipmentId, tenantId, byAdmin);
    res.json({ success: true, data: telemetry });
  }

  async applyPatches(req: Request, res: Response): Promise<void> {
    const { tenantId, byAdmin } = this.getUserContext(req);
    const equipmentId = String(req.params.equipmentId);
    const { patchIds } = req.body;
    const applied = await this.rmmPatchSvc.applyPatches(equipmentId, patchIds || [], tenantId, byAdmin);
    res.json({ success: true, data: applied });
  }
}


export const rmmController = new RmmController();
