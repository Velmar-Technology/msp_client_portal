import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ValidationError } from '@shared/errors';

export interface ValidatableSchema<T = any> {
  parse(data: unknown): T;
}

/**
 * Generic Zod validation middleware factory.
 * Validates request body, query, or params against a Zod schema and mutates with parsed/coerced values.
 *
 * @example
 * ```ts
 * router.post('/tickets', validate(CreateTicketDTO, 'body'), handler);
 * ```
 *
 * @param schema - Zod validation schema
 * @param source - Request property to validate ('body' | 'query' | 'params')
 * @returns Express middleware function
 * @throws {ValidationError} When schema validation fails
 */
export function validate(schema: ValidatableSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      // Replace with parsed/coerced data (mutate in-place for query/params as they are read-only properties in Express 5)
      if (source === 'body') {
        req.body = data;
      } else {
        const target = req[source] as Record<string, unknown>;
        for (const key in target) {
          delete target[key];
        }
        Object.assign(target, data);
      }
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === 'ZodError') {
        const rawErrors = Array.isArray(error.errors) ? error.errors : [];
        const fields = rawErrors.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path ?? ''),
          message: e.message,
        }));

        throw new ValidationError('Validation failed', { fields });
      }
      next(error);
    }
  };
}
