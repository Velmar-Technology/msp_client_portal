import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '@shared/errors';

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
export function validate(schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') {
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
    } catch (error) {
      if (error instanceof ZodError) {
        const fields = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        throw new ValidationError('Validation failed', { fields });
      }
      next(error);
    }
  };
}
