import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 * Validates request body, query, or params against a Zod schema.
 *
 * Usage: validate(CreateTicketDTO, 'body')
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
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
        const errors = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(error);
    }
  };
}
