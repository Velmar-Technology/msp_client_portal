import winston from 'winston';
import { env } from '@shared/config/env';
import { getRequestContext } from '@shared/middleware/requestIdMiddleware';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

/**
 * Winston format that enriches logs with asynchronous request, tenant, and trace context.
 */
const requestContextFormat = winston.format((info) => {
  try {
    const ctx = getRequestContext();
    if (ctx) {
      if (ctx.requestId && !info.requestId) info.requestId = ctx.requestId;
      if (ctx.tenantId && !info.tenantId) info.tenantId = ctx.tenantId;
      if (ctx.userId && !info.userId) info.userId = ctx.userId;
      if (ctx.traceId && !info.traceId) info.traceId = ctx.traceId;
    }
  } catch {
    // Fallback if context is unavailable
  }
  return info;
});

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}]: ${stack || message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    requestContextFormat(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
  ),
  defaultMeta: { service: 'msp-services' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: env.NODE_ENV === 'production'
        ? json()
        : combine(colorize(), devFormat),
    }),
    // File transports for production
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: json(),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: json(),
            maxsize: 5242880,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});
