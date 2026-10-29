import { AppError } from '../utils/AppError.js';

// Generic validation middleware using a Zod schema.
//   router.post('/register', validate(registerSchema), register)
//
// `source` says which part of the request to check ('body' | 'query' | 'params').
// The CLEANED data (trimmed, type-converted, unknown keys removed) is stored on
// req.valid so controllers never touch raw, unvalidated input.
export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || source,
        message: i.message,
      }));
      return next(new AppError(400, details[0]?.message || 'Invalid input', details));
    }
    req.valid = { ...(req.valid || {}), [source]: result.data };
    next();
  };
