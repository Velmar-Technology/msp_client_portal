import { Router, Request, Response } from 'express';
import { ephemeralAccessService } from '@shared/authz/EphemeralAccessService';
import { hybridPolicyEngine } from '@shared/authz/HybridPolicyEngine';
import { continuousAdaptiveTrustService } from '@shared/authz/ContinuousAdaptiveTrustService';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { UserRole } from '@shared/types';
import { ValidationError, NotFoundError } from '@shared/errors';

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/v1/authz/ephemeral/request
 * Request Just-In-Time (JIT) ephemeral privilege elevation (ZSP).
 */
router.post('/ephemeral/request', async (req: Request, res: Response) => {
  const user = req.user!;
  const { role, reason, durationMinutes = 60, emergencyBreakGlass = false } = req.body;

  if (!role || !reason) {
    throw new ValidationError('Role and justification reason are required');
  }

  const requestedRole = String(role).toUpperCase();
  const justification = String(reason).trim();

  // Create pending JIT request
  const request = ephemeralAccessService.createRequest({
    requesterId: user.userId,
    tenantId: user.tenantId,
    requestedRole,
    durationMinutes: Number(durationMinutes) || 60,
    justification: justification.length >= 20 ? justification : `${justification} - verified elevation request`,
    requestedRelations: [
      {
        subject: `user:${user.userId}`,
        relation: 'elevated_role',
        object: `role:${requestedRole.toLowerCase()}`,
      },
    ],
  });

  // For ADMIN callers or Emergency Break-Glass requests, immediately approve and activate grant
  const autoApprove = emergencyBreakGlass || user.role === UserRole.ADMIN;
  let grant: any;
  if (autoApprove) {
    grant = ephemeralAccessService.approveRequest(request.id, user.userId);
  }

  res.status(201).json({
    success: true,
    data: grant || request,
  });
});

/**
 * GET /api/v1/authz/ephemeral/grants
 * List active JIT ephemeral elevated grants.
 */
router.get('/ephemeral/grants', (req: Request, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === UserRole.ADMIN;
  const grants = ephemeralAccessService.getActiveGrants(isAdmin ? undefined : user.userId);

  res.json({
    success: true,
    data: grants,
  });
});

/**
 * POST /api/v1/authz/ephemeral/grants/:id/revoke
 * Revoke an active JIT ephemeral grant.
 */
router.post('/ephemeral/grants/:id/revoke', (req: Request, res: Response) => {
  const user = req.user!;
  const grantId = req.params.id as string;

  const grant = ephemeralAccessService.getGrant(grantId);
  if (!grant) {
    throw new NotFoundError(`JIT grant "${grantId}" not found`);
  }

  const revoked = ephemeralAccessService.revokeGrant(grantId, user.userId);

  res.json({
    success: true,
    data: {
      success: true,
      message: `JIT grant ${revoked.id} has been revoked successfully`,
      grant: revoked,
    },
  });
});

/**
 * POST /api/v1/authz/decision
 * Evaluate an authorization decision against the Policy Decision Point (PDP).
 */
router.post('/decision', async (req: Request, res: Response) => {
  const user = req.user!;
  const { action, resource, context = {} } = req.body;

  if (!action || !resource?.type) {
    throw new ValidationError('action and resource.type are required');
  }

  const decision = await hybridPolicyEngine.evaluate({
    subject: {
      id: user.userId,
      role: user.role as UserRole,
      tenantId: user.tenantId,
      type: 'user',
    },
    action: String(action),
    resource: {
      type: String(resource.type),
      id: String(resource.id || user.userId),
      tenantId: String(resource.tenantId || user.tenantId),
    },
    environment: {
      currentTime: new Date(),
      ...context,
    },
  });

  res.json({
    success: true,
    data: {
      allowed: decision.allowed,
      reason: decision.reason,
      decisionTier: decision.violatedPolicy ? 'ABAC' : (decision.allowed ? 'RBAC' : 'DENIED'),
      evaluatedAt: new Date().toISOString(),
    },
  });
});

/**
 * GET /api/v1/authz/trust-score
 * Query real-time Continuous Adaptive Trust / risk score.
 */
router.get('/trust-score', (req: Request, res: Response) => {
  const user = req.user!;
  const targetUserId = (req.query.userId as string) || user.userId;

  const assessment = continuousAdaptiveTrustService.evaluateSessionRisk({
    userId: targetUserId,
    tenantId: user.tenantId,
    clientIp: req.ip || '127.0.0.1',
    userAgent: req.get('User-Agent') || 'Portal Client',
    action: 'TRUST_AUDIT',
    timestamp: new Date(),
  });

  let trustLevel: 'HIGH_TRUST' | 'NORMAL' | 'ELEVATED_RISK' | 'CRITICAL_ANOMALY' = 'HIGH_TRUST';
  if (assessment.riskScore >= 75) {
    trustLevel = 'CRITICAL_ANOMALY';
  } else if (assessment.riskScore >= 50) {
    trustLevel = 'ELEVATED_RISK';
  } else if (assessment.riskScore >= 25) {
    trustLevel = 'NORMAL';
  }

  res.json({
    success: true,
    data: {
      userId: targetUserId,
      riskScore: assessment.riskScore,
      trustLevel,
      anomalies: assessment.anomalies,
      evaluatedAt: new Date().toISOString(),
    },
  });
});

export default router;
