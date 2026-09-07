import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '@shared/errors';
import { runInTenantContext } from '@shared/db/tenantContext';

/**
 * Predicate checking whether an HTTP path is a public or system endpoint exempt from tenant scoping.
 */
export function isPublicOrSystemRoute(path: string, originalUrl?: string): boolean {
  const publicPrefixes = [
    '/health',
    '/auth',
    '/metrics',
    '/docs',
    '/swagger',
    '/agent-ws',
    '/invoices/webhook',
    '/billing/invoices/webhook',
  ];

  const targets = [path, originalUrl || '']
    .map((p) => p.split('?')[0].replace(/^\/api\/v1/, ''))
    .filter(Boolean);

  const isAgentEndpoint = targets.some((target) =>
    target === '/tickets/agent' ||
    target.startsWith('/tickets/agent/') ||
    target.endsWith('/responses/agent')
  );
  if (isAgentEndpoint) {
    return true;
  }

  return targets.some((target) =>
    publicPrefixes.some((prefix) => target === prefix || target.startsWith(`${prefix}/`) || target.startsWith(prefix))
  );
}

/**
 * Gateway Tenant Context Middleware.
 * Enforces fail-closed multi-tenant boundary by binding tenant ID from headers or JWT
 * into Node.js AsyncLocalStorage for downstream query execution.
 *
 * @throws {ForbiddenError} When a tenant-scoped endpoint is called without tenant credentials
 */
export function gatewayTenantContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Allow explicitly opted-out routes or public infrastructure paths
  if ((req as any).skipTenantContext || isPublicOrSystemRoute(req.path, req.originalUrl)) {
    return next();
  }

  const tenantId = (req.headers['x-tenant-id'] as string) || (req.user?.tenantId as string);

  if (!tenantId) {
    return next(new ForbiddenError('TENANT_CONTEXT_REQUIRED: Tenant identification is required to access this resource'));
  }

  const userId = (req.headers['x-user-id'] as string) || (req.user?.userId as string);
  const role = req.user?.role;
  const isSystemAdmin = role === 'ADMIN';

  runInTenantContext(
    {
      tenantId,
      userId,
      role,
      isSystemAdmin,
    },
    () => {
      next();
    }
  );
}
