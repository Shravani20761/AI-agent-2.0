import { err } from '../lib/response.js';

export const validate = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target]);
  if (!result.success) {
    return err(res, 'Validation failed', 422, result.error.flatten().fieldErrors);
  }
  req[target] = result.data;
  next();
};
