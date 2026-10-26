import { AppError } from '../utils/AppError.js';

/**
 * Validate request params, query and body against Zod schemas.
 *
 * Parsed (trimmed, coerced, defaulted) values are stored on `req.validated`, and the body is
 * replaced with its parsed version so unknown fields never reach the database layer
 * (protection against mass assignment, e.g. a client sending its own "userId").
 *
 * Usage: router.post('/', validate({ body: createSchema }), handler)
 */
export const validate = (schemas) => (req, _res, next) => {
  const validated = { ...req.validated };
  const details = [];

  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part] ?? {});
    if (result.success) {
      validated[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({ field: issue.path.join('.') || part, message: issue.message });
      }
    }
  }

  if (details.length > 0) {
    return next(AppError.badRequest(details[0].message, 'VALIDATION_ERROR', details));
  }

  req.validated = validated;
  if (validated.body) req.body = validated.body;
  return next();
};
