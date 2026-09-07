import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@shared/errors';
import { equipmentRepository } from '@modules/equipment';
import { runInTenantContext } from '@shared/db/tenantContext';

/**
 * Express middleware validating machine-authenticated requests from endpoint RMM agents.
 * Extracts the bearer token from the Authorization header, verifies it against active equipment records,
 * and populates `req.agent` with the equipment, slot, client owner, and tenant context.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 * @throws {UnauthorizedError} When Authorization header or agent token is missing or malformed
 * @throws {ForbiddenError} When the agent token is invalid or the equipment slot is not in active/bound status
 */
export async function agentAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof req.query?.token === 'string' && req.query.token.length > 0) {
    token = req.query.token as string;
  }

  if (!token) {
    return next(new UnauthorizedError('Missing or invalid agent authorization header'));
  }

  try {
    const result = await equipmentRepository.findByAgentToken(token);

    if (!result) {
      return next(new ForbiddenError('Invalid or unrecognized agent token'));
    }

    const { equipment, clientId, tenantId } = result;

    // Reject inactive or decommissioned equipment slots
    const validStatuses = ['ACTIVE', 'BOUND', 'ONLINE'];
    if (!validStatuses.includes(equipment.status)) {
      return next(new ForbiddenError(`Equipment slot status '${equipment.status}' is not authorized to submit agent requests`));
    }

    req.agent = {
      equipmentId: equipment.id,
      slotId: equipment.id,
      tenantId: tenantId,
      clientId: clientId,
      hostname: equipment.agent_hostname ?? null,
      deviceName: equipment.device_name ?? null,
    };

    req.headers['x-tenant-id'] = tenantId;
    req.headers['x-user-id'] = clientId;

    runInTenantContext(
      {
        tenantId,
        userId: clientId,
        role: 'CLIENT',
      },
      () => next()
    );
  } catch (error) {
    next(error);
  }
}
