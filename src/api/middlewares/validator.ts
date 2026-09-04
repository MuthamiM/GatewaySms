import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../../shared/errors/app-error.js';

export function validate(schema: { body?: AnyZodObject; query?: AnyZodObject; params?: AnyZodObject }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as any;
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as any;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        next(new ValidationError('Request validation failed', issues));
      } else {
        next(err);
      }
    }
  };
}
