import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/types';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import type { SubscriptionService } from '@modules/subscriptions';

/**
 * Subscription Feature Gate Middleware.
 *
 * Restricts endpoint access strictly to tenants possessing the designated
 * active subscription plan feature.
 *
 * Operational rules:
 * - Unauthenticated requests trigger UnauthorizedError (401).
 * - ADMIN and TECHNICIAN roles bypass the feature gate unconditionally to maintain support operations.
 * - CLIENT users must belong to a tenant possessing an active/expiring subscription that includes the required feature.
 * - Otherwise, throws a typed ForbiddenError (403).
 *
 * @param featureCode - Canonical feature code identifier (e.g. 'PASSWORD_MANAGER', 'RMM_PATCH_MANAGEMENT')
 * @param subService - Optional SubscriptionService instance for dependency injection in tests
 * @returns Express middleware function
 * @throws {UnauthorizedError} When req.user is absent
 * @throws {ForbiddenError} When tenant lacks active subscription feature entitlement
 */
export function requireSubscriptionFeature(
  featureCode: string,
  subService?: SubscriptionService
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Role-based bypass: Admins and Technicians have global operational entitlement
    if (req.user.role !== UserRole.CLIENT) {
      return next();
    }

    const tenantId = (req.user as any).tenantId || (req.user as any).tenant_id;
    if (!tenantId) {
      throw new ForbiddenError('Tenant association required for subscription feature verification');
    }

    let service = subService;
    if (!service) {
      const subscriptionsModule = await import('@modules/subscriptions');
      service = subscriptionsModule.subscriptionService;
    }

    const activeFeatures = await service.getClientActiveFeatures(tenantId);

    if (!activeFeatures.includes(featureCode)) {
      throw new ForbiddenError(
        `Access denied. Your active subscription does not include the '${featureCode}' feature. Please upgrade your plan.`
      );
    }

    next();
  };
}
