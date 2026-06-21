import { z } from 'zod';
import { AppError } from './base-error';
import { InternalServerError } from './domain-errors';

/**
 * Zod validation schema representing a serialized error response payload
 */
export const SerializedErrorSchema = z.object({
  success: z.literal(false),
  code: z.string().toUpperCase(),
  message: z.string(),
  correlationId: z.string(),
  details: z.record(z.any()).optional(),
  stack: z.string().optional()
});

export type SerializedErrorPayload = z.infer<typeof SerializedErrorSchema>;

/**
 * Serializes any thrown exception into a structured payload.
 * Ensures internal database logs and stack traces are suppressed in production.
 *
 * @param err The caught error instance
 * @param isProduction Boolean flag determining output masking
 * @returns SerializedErrorPayload object safe for client networks
 */
export function serializeError(err: unknown, isProduction: boolean): SerializedErrorPayload {
  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else {
    const nativeError = err instanceof Error ? err : new Error(String(err));
    appError = new InternalServerError('An internal server error occurred', nativeError);
  }

  const payload: SerializedErrorPayload = {
    success: false,
    code: appError.code,
    message: appError.isOperational 
      ? appError.message 
      : 'An internal server error occurred. Please contact support.',
    correlationId: appError.correlationId,
    ...(Object.keys(appError.details).length > 0 ? { details: appError.details } : {})
  };

  if (!isProduction) {
    payload.stack = appError.stack;
    if (appError.originalError) {
      payload.details = {
        ...payload.details,
        originalError: {
          name: appError.originalError.name,
          message: appError.originalError.message,
          stack: appError.originalError.stack
        }
      };
    }
  }

  return payload;
}
