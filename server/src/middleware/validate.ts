import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

// Validates req.body / req.query / req.params with a Zod schema.
// On success the parsed (typed, cleaned) value replaces the original.
// Usage: router.post('/', validate({ body: createParcelSchema }), handler)
export function validate(schemas: { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) req.params = schemas.params.parse(req.params);
    if (schemas.query) Object.defineProperty(req, 'query', { value: schemas.query.parse(req.query) });
    next();
  };
}
