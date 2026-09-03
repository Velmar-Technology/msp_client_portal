import { AsyncLocalStorage } from 'node:async_hooks';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@shared/utils/logger';

export interface RequestContext {
  requestId: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  userId?: string;
  startTime: number;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Returns the currently active RequestContext from AsyncLocalStorage.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Parses W3C traceparent header (version-traceid-parentid-traceflags).
 */
export function parseTraceparent(header?: string): { traceId?: string; spanId?: string } {
  if (!header || typeof header !== 'string') return {};
  const parts = header.trim().split('-');
  if (parts.length >= 4 && parts[1].length === 32 && parts[2].length === 16) {
    return {
      traceId: parts[1],
      spanId: parts[2],
    };
  }
  return {};
}

/**
 * Request ID & W3C Distributed Trace Context Propagation Middleware.
 * Generates or propagates X-Request-Id and W3C traceparent, binding them into
 * AsyncLocalStorage and emitting structured logs with request timing metadata.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const incomingRequestId = req.headers['x-request-id'] as string;
  const requestId = incomingRequestId || uuidv4();

  // Attach X-Request-Id to response headers
  res.setHeader('X-Request-Id', requestId);

  // Extract W3C trace context or Datadog trace header
  const traceparent = req.headers['traceparent'] as string;
  const { traceId, spanId } = parseTraceparent(traceparent);
  const ddTraceId = (req.headers['x-datadog-trace-id'] as string) || traceId;

  const tenantId = (req.headers['x-tenant-id'] as string) || (req.user?.tenantId as string);
  const userId = (req.headers['x-user-id'] as string) || (req.user?.userId as string);

  const context: RequestContext = {
    requestId,
    traceId: ddTraceId,
    spanId,
    tenantId,
    userId,
    startTime,
  };

  // Log on response completion
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const currentTenant = context.tenantId || (req.headers['x-tenant-id'] as string) || (req.user?.tenantId as string);
    const currentUserId = context.userId || (req.headers['x-user-id'] as string) || (req.user?.userId as string);

    logger.info(`${req.method} ${req.originalUrl || req.url} ${res.statusCode} - ${durationMs}ms`, {
      requestId,
      traceId: ddTraceId,
      tenantId: currentTenant,
      userId: currentUserId,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });

  requestContextStorage.run(context, () => {
    next();
  });
}
