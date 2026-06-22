import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.utils.js';

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On success it replaces req.body with the parsed (coerced + stripped) value.
 * On failure it responds 400 with field-level error details.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      errorResponse(res, 'Validation failed', 400, result.error.flatten().fieldErrors);
      return;
    }
    req.body = result.data;
    next();
  };
}
