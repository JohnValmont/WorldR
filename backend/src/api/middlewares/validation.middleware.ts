import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { ValidationError } from '../../utils/errors';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      next(new ValidationError('Validation failed', error.errors));
    }
  };
}
