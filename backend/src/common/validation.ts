import { ApiError } from './errors.ts';

/** Rejects mass-assignment: input keys must be explicitly declared by the DTO. */
export function whitelist<T extends object>(input: unknown, allowed: readonly string[]): T {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Request body must be an object.');
  }
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Unknown request field: ${unknown[0]}.`);
  }
  return input as T;
}

export const validateStatus = (status: number) => {
  if (![400, 401, 403, 404, 409].includes(status)) throw new Error('unsupported contract status');
  return status;
};
