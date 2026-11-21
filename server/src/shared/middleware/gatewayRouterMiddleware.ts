import { Router, Request, Response, NextFunction } from 'express';
import { registeredModuleManifests } from '@shared/registry/modules.generated';
import { resolveModuleRouteMounts } from '@shared/registry/moduleManifest.types';

/**
 * Express router acting as the API Gateway Layer Cluster Dispatcher.
 * Maps path clusters (e.g., /billing, /workspaces) to internal microservice/domain routers
 * while enforcing uniform header propagation (X-User-Id, X-Tenant-Id).
 *
 * Fully zero-touch: automatically mounts all discovered flat & hierarchical module manifests
 * from `server/src/modules/**\/manifest.ts` (ADR-017).
 */
export const gatewayClusterRouter = Router();

// Auto-discovered flat & hierarchical module manifests (`server/src/modules/**/manifest.ts`)
for (const mount of resolveModuleRouteMounts(registeredModuleManifests)) {
  gatewayClusterRouter.use(mount.prefix, mount.router);
}

/**
 * Middleware ensuring standard Gateway Header (`X-User-Id`, `X-Tenant-Id`) propagation on all cluster requests.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 */
export function gatewayHeaderPropagatorMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.user?.userId && !req.headers['x-user-id']) {
    req.headers['x-user-id'] = req.user.userId;
  }
  if (req.user?.tenantId && !req.headers['x-tenant-id']) {
    req.headers['x-tenant-id'] = req.user.tenantId;
  }
  next();
}
