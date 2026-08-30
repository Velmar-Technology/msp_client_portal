import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import { hybridPolicyEngine, AuthzContext } from '../authz';

/**
 * Resource extractor function definition.
 */
export type ResourceExtractor = (req: Request) => {
  id?: string | string[];
  tenantId?: string;
  ownerId?: string;
  attributes?: Record<string, unknown>;
};

/**
 * SOTA Hybrid Authorization Middleware factory.
 * Enforces unified RBAC + ReBAC (Zanzibar graph relations) + ABAC (context/predicates) across all API endpoints.
 *
 * @example
 * ```ts
 * router.get(
 *   '/:id',
 *   authorize('read', 'ticket', (req) => ({ id: req.params.id, tenantId: req.user?.tenantId })),
 *   controller.getTicket
 * );
 * ```
 *
 * @param action - Action to be authorized ('read', 'write', 'create', 'update', 'cancel', 'delete')
 * @param resourceType - Resource domain namespace ('ticket', 'invoice', 'plan', 'equipment', 'lead', etc.)
 * @param extractResource - Optional function to derive resource metadata from Request
 * @returns Express middleware function
 * @throws {UnauthorizedError} When user is unauthenticated
 * @throws {ForbiddenError} When the SOTA hybrid authorization decision is DENIED
 */
export function authorize(
  action: string,
  resourceType: string,
  extractResource?: ResourceExtractor,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = req.user;
    const resourceMeta = extractResource
      ? extractResource(req)
      : {
          id: req.params.id || req.body?.id || 'new',
          tenantId: user.tenantId,
          ownerId: user.userId,
          attributes: undefined,
        };

    const rawId = resourceMeta.id;
    const normalizedId = Array.isArray(rawId) ? rawId[0] : rawId || 'unknown';

    const ctx: AuthzContext = {
      subject: {
        id: user.userId,
        type: 'user',
        role: user.role,
        tenantId: user.tenantId,
      },
      action,
      resource: {
        id: normalizedId,
        type: resourceType,
        tenantId: resourceMeta.tenantId,
        ownerId: resourceMeta.ownerId,
        attributes: resourceMeta.attributes,
      },
      environment: {
        accountStatus: user.accountStatus,
        clientIp: req.ip,
        timestamp: new Date(),
      },
    };

    const decision = await hybridPolicyEngine.evaluate(ctx);

    if (!decision.allowed) {
      throw new ForbiddenError(decision.reason || 'Access denied by authorization policy');
    }

    next();
  };
}
